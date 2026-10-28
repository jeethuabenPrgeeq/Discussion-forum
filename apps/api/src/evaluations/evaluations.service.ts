import { Injectable, NotFoundException } from '@nestjs/common';
import type { Evaluation, EvaluationStatus, Prisma, User } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { ForumAccessService } from '../forums/forum-access.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveEvaluationDto } from './dto/evaluation.dto';

type EvaluationRow = Evaluation & { evaluator: User | null };

const toEvaluationDto = (row: EvaluationRow) => {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const evaluatorName = row.evaluator ? `${row.evaluator.firstName} ${row.evaluator.lastName}`.trim() : '';
  return {
    ...data,
    personId: row.learnerId,
    status: row.status.toLowerCase(),
    grade: row.grade,
    evaluator: typeof data.evaluator === 'string' && data.evaluator ? data.evaluator : evaluatorName,
    updatedAt: row.updatedAt.toISOString(),
  };
};

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ForumAccessService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser, forumId: string) {
    await this.access.forum(user, forumId);
    const rows = await this.prisma.evaluation.findMany({
      where: user.role === 'CREATOR' ? { forumId } : { forumId, learnerId: user.id, status: 'PUBLISHED' },
      include: { evaluator: true },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toEvaluationDto);
  }

  async save(user: AuthUser, forumId: string, learnerId: string, dto: SaveEvaluationDto) {
    await this.access.forum(user, forumId);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { forumId_userId: { forumId, userId: learnerId } },
      include: { user: true, forum: true },
    });
    if (!enrollment) throw new NotFoundException('This person is not in the forum');

    const status = dto.status.toUpperCase() as EvaluationStatus;
    const previous = await this.prisma.evaluation.findUnique({ where: { forumId_learnerId: { forumId, learnerId } } });
    const publishedAt = status === 'PUBLISHED' ? (previous?.publishedAt ?? new Date()) : null;
    const fields = { evaluatorId: user.id, status, grade: dto.grade ?? null, data: dto.data as Prisma.InputJsonValue, publishedAt };

    const saved = await this.prisma.evaluation.upsert({
      where: { forumId_learnerId: { forumId, learnerId } },
      create: { forumId, learnerId, ...fields },
      update: fields,
      include: { evaluator: true },
    });

    if (status === 'PUBLISHED' && previous?.status !== 'PUBLISHED') {
      const grade = saved.grade !== null ? ` You scored ${saved.grade}.` : '';
      await this.notifications.notify(learnerId, {
        type: 'grade',
        title: `Your grade for ${enrollment.forum.title} is published`,
        body: grade.trim() || 'Open Grades to see your marks and feedback.',
        forumId,
      });
      await this.mail.send({
        to: enrollment.user.email,
        subject: `Your grade for "${enrollment.forum.title}" is published`,
        text: `Hi ${enrollment.user.firstName},\n\nYour evaluation for ${enrollment.forum.weekLabel} - ${enrollment.forum.title} is now published.${grade}\n\nSign in to see the feedback.`,
      });
    }

    return toEvaluationDto(saved);
  }
}