import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuditEntry, Forum, Post, Report, ReportDecision, Topic, User } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { formatDay, formatDayTime, plainText } from '../common/format';
import { ForumAccessService } from '../forums/forum-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { shortName } from '../posts/post.mapper';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReportDto, ListReportsQuery, ResolveReportDto } from './dto/report.dto';

type ReportRow = Report & {
  reporter: User;
  audit: AuditEntry[];
  post: Post & { author: User; topic: Topic & { forum: Forum } };
};

const REPORT_INCLUDE = {
  reporter: true,
  audit: { orderBy: { createdAt: 'asc' as const } },
  post: { include: { author: true, topic: { include: { forum: true } } } },
};

const DECISION_FROM_DTO: Record<ResolveReportDto['decision'], ReportDecision> = {
  dismiss: 'DISMISS',
  hide: 'HIDE',
  'remove-warn': 'REMOVE_WARN',
  'remove-deduct': 'REMOVE_DEDUCT',
};

const DECISION_TO_DTO: Record<ReportDecision, ResolveReportDto['decision']> = {
  DISMISS: 'dismiss',
  HIDE: 'hide',
  REMOVE_WARN: 'remove-warn',
  REMOVE_DEDUCT: 'remove-deduct',
};

const AUDIT_TEXT: Record<ReportDecision, string> = {
  DISMISS: 'Report dismissed. The post stays visible.',
  HIDE: 'Post hidden from learners. Kept for audit.',
  REMOVE_WARN: 'Post removed and a warning saved on the author record.',
  REMOVE_DEDUCT: 'Post removed and a mark deduction saved for grading.',
};

const AUTHOR_TITLE: Record<ReportDecision, string> = {
  DISMISS: '',
  HIDE: 'Your post was hidden by an instructor',
  REMOVE_WARN: 'Your post was removed and a warning was recorded',
  REMOVE_DEDUCT: 'Your post was removed and marks will be deducted',
};

const toReportDto = (report: ReportRow) => ({
  id: `R-${100 + report.number}`,
  reportId: report.id,
  postId: report.postId,
  topicId: report.post.topicId,
  label: report.reason.toLowerCase().replace(/[^a-z]+/g, '-'),
  reporter: shortName(report.reporter),
  reporterShort: `${shortName(report.reporter)}.`,
  author: shortName(report.post.author),
  authorShort: `${shortName(report.post.author)}.`,
  reason: report.reason,
  details: report.details,
  weekLabel: report.post.topic.forum.weekLabel.split(' - ')[0],
  topic: report.post.topic.forum.title,
  topicTitle: report.post.topic.title,
  postedAt: formatDayTime(report.post.createdAt),
  flaggedOn: formatDay(report.createdAt),
  content: plainText(report.post.body),
  status: report.status === 'PENDING' ? 'pending' : 'resolved',
  resolution:
    report.status === 'RESOLVED' && report.decision
      ? { decision: DECISION_TO_DTO[report.decision], note: report.note ?? '', notified: report.notified ?? '' }
      : undefined,
  audit: report.audit.map((a) => ({ at: formatDayTime(a.createdAt), text: a.text })),
});

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ForumAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthUser, postId: string, dto: CreateReportDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, include: { author: true } });
    if (!post || post.removedAt) throw new NotFoundException('Post not found');
    await this.access.topic(user, post.topicId);

    const existing = await this.prisma.report.findUnique({ where: { postId_reporterId: { postId, reporterId: user.id } } });
    if (existing) throw new ConflictException('You already reported this post');

    const reporter = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.report.create({
        data: { postId, reporterId: user.id, reason: dto.reason, details: dto.details?.trim() ?? '' },
      });
      await tx.auditEntry.create({
        data: { reportId: created.id, text: `Reported by ${shortName(reporter)} as "${dto.reason}".` },
      });
      await tx.topic.update({ where: { id: post.topicId }, data: { reportCount: { increment: 1 } } });
      return tx.report.findUniqueOrThrow({ where: { id: created.id }, include: REPORT_INCLUDE });
    });

    await this.notifications.notify(report.post.topic.forum.ownerId, {
      type: 'report-new',
      title: `${shortName(reporter)} reported a post (${dto.reason})`,
      body: report.post.topic.title,
      forumId: report.post.topic.forumId,
      topicId: report.post.topicId,
    });

    return toReportDto(report);
  }

  async list(user: AuthUser, forumId: string, query: ListReportsQuery) {
    await this.access.forum(user, forumId);
    const reports = await this.prisma.report.findMany({
      where: {
        post: { topic: { forumId } },
        status: query.status === 'pending' ? 'PENDING' : query.status === 'resolved' ? 'RESOLVED' : undefined,
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: REPORT_INCLUDE,
    });
    return reports.map(toReportDto);
  }

  async get(user: AuthUser, reportId: string) {
    const report = await this.findReport(reportId);
    await this.access.topic(user, report.post.topicId);
    return toReportDto(report);
  }

  async resolve(user: AuthUser, reportId: string, dto: ResolveReportDto) {
    const report = await this.findReport(reportId);
    await this.access.topic(user, report.post.topicId);
    if (report.status === 'RESOLVED') throw new BadRequestException('This report is already resolved');

    const decision = DECISION_FROM_DTO[dto.decision];
    const resolver = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const author = report.post.author;
    const forumId = report.post.topic.forumId;
    const notified = decision === 'DISMISS' ? shortName(report.reporter) : shortName(author);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: report.id },
        data: { status: 'RESOLVED', decision, note: dto.note?.trim() || null, notified, resolvedById: user.id, resolvedAt: now },
      });
      await tx.auditEntry.create({
        data: { reportId: report.id, text: `${AUDIT_TEXT[decision]} Resolved by ${shortName(resolver)}.` },
      });
      if (dto.note?.trim()) {
        await tx.auditEntry.create({ data: { reportId: report.id, text: `Note: ${dto.note.trim()}` } });
      }
      if (decision === 'HIDE') {
        await tx.post.update({ where: { id: report.postId }, data: { hiddenAt: now } });
      }
      if (decision === 'REMOVE_WARN' || decision === 'REMOVE_DEDUCT') {
        await tx.post.update({ where: { id: report.postId }, data: { removedAt: now, isBestAnswer: false } });
        await tx.enrollment.updateMany({
          where: { forumId, userId: author.id },
          data: decision === 'REMOVE_WARN' ? { warnings: { increment: 1 } } : { deductions: { increment: 1 } },
        });
      }
      const topic = await tx.topic.findUniqueOrThrow({ where: { id: report.post.topicId } });
      if (topic.reportCount > 0) {
        await tx.topic.update({ where: { id: topic.id }, data: { reportCount: { decrement: 1 } } });
      }
    });

    const topicTitle = report.post.topic.title;
    await this.notifications.notify(report.reporterId, {
      type: 'report',
      title: 'Your report was reviewed',
      body: `${topicTitle}: ${AUDIT_TEXT[decision]}`,
      forumId,
      topicId: report.post.topicId,
    });
    if (decision !== 'DISMISS') {
      await this.notifications.notify(author.id, {
        type: 'moderation',
        title: AUTHOR_TITLE[decision],
        body: dto.note?.trim() ? `${topicTitle}: ${dto.note.trim()}` : topicTitle,
        forumId,
        topicId: report.post.topicId,
      });
    }

    return toReportDto(await this.findReport(reportId));
  }

  private async findReport(reportId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId }, include: REPORT_INCLUDE });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}