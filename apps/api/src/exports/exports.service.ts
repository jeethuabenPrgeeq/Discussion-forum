import { Injectable } from '@nestjs/common';
import type { Forum, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument = require('pdfkit');
import JSZip = require('jszip');
import type { AuthUser } from '../common/auth-user';
import { ForumAccessService } from '../forums/forum-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { UPLOAD_DIR } from '../uploads/upload.config';

export const EXPORT_SECTIONS = ['topics', 'people', 'grades', 'reports'] as const;
export type ExportSection = (typeof EXPORT_SECTIONS)[number];
export type ExportFormat = 'xlsx' | 'pdf' | 'csv';

export interface ExportOptions {
  group?: string;
  range?: 'all' | '7d' | '30d';
  attachments?: boolean;
}

interface Filters {
  group?: string;
  since?: Date;
}

type Cell = string | number;

interface Table {
  title: string;
  columns: string[];
  rows: Cell[][];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const stamp = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '');
const nameOf = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'topic';

const csvCell = (value: Cell) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const MIME: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  csv: 'text/csv; charset=utf-8',
};

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ForumAccessService,
  ) {}

  async build(user: AuthUser, forumId: string, format: ExportFormat, sections: ExportSection[], options: ExportOptions = {}) {
    await this.access.forum(user, forumId);
    const forum = await this.prisma.forum.findUniqueOrThrow({ where: { id: forumId } });
    const isCreator = user.role === 'CREATOR';
    const allowed = isCreator ? sections : sections.filter((s) => s === 'topics');
    const filters: Filters = {
      group: options.group && options.group !== 'all' ? options.group : undefined,
      since: options.range === '7d' ? new Date(Date.now() - 7 * DAY_MS) : options.range === '30d' ? new Date(Date.now() - 30 * DAY_MS) : undefined,
    };
    const tables = await Promise.all((allowed.length ? allowed : ['topics' as const]).map((s) => this.table(forumId, s, filters)));
    const base = slug(`${forum.weekLabel}-${forum.title}`);

    const buffer = format === 'csv' ? this.csv(tables) : format === 'pdf' ? await this.pdf(forum, tables) : await this.xlsx(tables);
    const main = { buffer, filename: `${base}.${format}`, mime: MIME[format] };

    if (!options.attachments || !isCreator) return main;
    const files = await this.attachmentFiles(forumId, filters);
    return { buffer: await this.zip(main, files), filename: `${base}.zip`, mime: 'application/zip' };
  }

  private topicWhere(forumId: string, f: Filters): Prisma.TopicWhereInput {
    return { forumId, ...(f.group ? { group: f.group } : {}) };
  }

  private async table(forumId: string, section: ExportSection, f: Filters): Promise<Table> {
    if (section === 'topics') {
      const topics = await this.prisma.topic.findMany({
        where: { ...this.topicWhere(forumId, f), ...(f.since ? { lastActivityAt: { gte: f.since } } : {}) },
        include: { author: true, _count: { select: { posts: { where: { removedAt: null } } } } },
        orderBy: [{ isPinned: 'desc' }, { lastActivityAt: 'desc' }],
      });
      return {
        title: 'Topics',
        columns: ['Topic', 'Created by', 'Group', 'Replies', 'Status', 'Pinned', 'Locked', 'Last activity'],
        rows: topics.map((t) => [
          t.title,
          nameOf(t.author),
          t.group ?? '',
          Math.max(0, t._count.posts - 1),
          title(t.state),
          t.isPinned ? 'Yes' : 'No',
          t.isLocked ? 'Yes' : 'No',
          stamp(t.lastActivityAt),
        ]),
      };
    }

    if (section === 'people') {
      const [enrollments, posts] = await Promise.all([
        this.prisma.enrollment.findMany({
          where: { forumId, ...(f.group ? { group: f.group } : {}) },
          include: { user: true },
          orderBy: { user: { firstName: 'asc' } },
        }),
        this.prisma.post.findMany({
          where: { removedAt: null, topic: { forumId }, ...(f.since ? { createdAt: { gte: f.since } } : {}) },
          select: { authorId: true },
        }),
      ]);
      const counts = new Map<string, number>();
      posts.forEach((p) => counts.set(p.authorId, (counts.get(p.authorId) ?? 0) + 1));
      return {
        title: 'People',
        columns: ['Name', 'Email', 'Role', 'Group', 'Posts', 'Warnings', 'Deductions'],
        rows: enrollments.map((e) => [
          nameOf(e.user),
          e.user.email,
          e.role === 'AUDITOR' ? 'Auditor' : 'Learner',
          e.group ?? '',
          counts.get(e.userId) ?? 0,
          e.warnings,
          e.deductions,
        ]),
      };
    }

    if (section === 'grades') {
      const [enrollments, evaluations] = await Promise.all([
        this.prisma.enrollment.findMany({
          where: { forumId, role: 'LEARNER', ...(f.group ? { group: f.group } : {}) },
          include: { user: true },
          orderBy: { user: { firstName: 'asc' } },
        }),
        this.prisma.evaluation.findMany({ where: { forumId } }),
      ]);
      const byLearner = new Map(evaluations.map((e) => [e.learnerId, e]));
      return {
        title: 'Grades',
        columns: ['Name', 'Email', 'Status', 'Grade', 'Published'],
        rows: enrollments.map((e) => {
          const ev = byLearner.get(e.userId);
          return [nameOf(e.user), e.user.email, ev ? title(ev.status) : 'Pending', ev?.grade ?? '', stamp(ev?.publishedAt)];
        }),
      };
    }

    const reports = await this.prisma.report.findMany({
      where: { post: { topic: this.topicWhere(forumId, f) }, ...(f.since ? { createdAt: { gte: f.since } } : {}) },
      include: { reporter: true, post: { include: { author: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      title: 'Reports',
      columns: ['Ref', 'Reason', 'Reported by', 'Author', 'Status', 'Decision', 'Flagged on'],
      rows: reports.map((r) => [
        `R-${100 + r.number}`,
        r.reason,
        nameOf(r.reporter),
        nameOf(r.post.author),
        title(r.status),
        r.decision ? title(r.decision).replace(/_/g, ' ') : '',
        stamp(r.createdAt),
      ]),
    };
  }

  private async attachmentFiles(forumId: string, f: Filters) {
    const files = await this.prisma.attachment.findMany({
      where: {
        post: {
          removedAt: null,
          topic: this.topicWhere(forumId, f),
          ...(f.since ? { createdAt: { gte: f.since } } : {}),
        },
      },
      include: { post: { include: { topic: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const used = new Set<string>();
    return files.map((file) => {
      const folder = slug(file.post?.topic.title ?? 'topic');
      let name = `attachments/${folder}/${file.name}`;
      let n = 2;
      while (used.has(name)) {
        name = `attachments/${folder}/${n}-${file.name}`;
        n += 1;
      }
      used.add(name);
      return { path: join(UPLOAD_DIR, file.path), name };
    });
  }

  private zip(main: { buffer: Buffer; filename: string }, files: { path: string; name: string }[]): Promise<Buffer> {
    const archive = new JSZip();
    archive.file(main.filename, main.buffer);
    for (const file of files) {
      if (existsSync(file.path)) archive.file(file.name, readFileSync(file.path));
    }
    return archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private csv(tables: Table[]): Buffer {
    const lines: string[] = [];
    tables.forEach((t, i) => {
      if (i > 0) lines.push('');
      lines.push(csvCell(t.title));
      lines.push(t.columns.map(csvCell).join(','));
      t.rows.forEach((r) => lines.push(r.map(csvCell).join(',')));
    });
    return Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf8');
  }

  private async xlsx(tables: Table[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NeuroLXP Discussion Forum';
    for (const t of tables) {
      const sheet = workbook.addWorksheet(t.title);
      const header = sheet.addRow(t.columns);
      header.font = { bold: true };
      t.rows.forEach((r) => sheet.addRow(r));
      sheet.columns.forEach((col, i) => {
        const longest = Math.max(t.columns[i]?.length ?? 10, ...t.rows.map((r) => String(r[i] ?? '').length));
        col.width = Math.min(50, Math.max(10, longest + 2));
      });
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    }
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data as ArrayBuffer);
  }

  private pdf(forum: Forum, tables: Table[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = 40;
      const usable = doc.page.width - 80;

      doc.font('Helvetica-Bold').fontSize(18).text(forum.title, left);
      doc.font('Helvetica').fontSize(10).fillColor('#555555')
        .text(`${forum.weekLabel} - ${forum.course} - exported ${new Date().toISOString().slice(0, 10)}`, left);

      for (const t of tables) {
        doc.moveDown(1.2);
        if (doc.y > doc.page.height - 100) doc.addPage();
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#2D4CC8').text(t.title, left);
        doc.moveDown(0.4);
        const colWidth = usable / t.columns.length;

        const drawRow = (cells: Cell[], bold: boolean) => {
          if (doc.y > doc.page.height - 60) doc.addPage();
          const y = doc.y;
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#111111');
          cells.forEach((cell, i) => {
            doc.text(String(cell), left + i * colWidth, y, { width: colWidth - 6, lineBreak: false, ellipsis: true });
          });
          doc.y = y + 16;
          doc.x = left;
        };

        drawRow(t.columns, true);
        if (t.rows.length === 0) drawRow(['No records'], false);
        t.rows.forEach((r) => drawRow(r, false));
      }

      doc.end();
    });
  }
}