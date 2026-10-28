import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Notification, Prisma } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type { AlertPreferencesDto } from './dto/alert-preferences.dto';

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  forumId?: string | null;
  topicId?: string | null;
  questionId?: string | null;
}

export const DEFAULT_ALERTS = { subscribe: 'all', digest: 'daily', tellWhen: 'replies', autoRead: true };

const SUBSCRIBABLE = new Set(['reply']);

const toNotificationDto = (n: Notification) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  forumId: n.forumId,
  topicId: n.topicId,
  questionId: n.questionId,
  read: n.readAt !== null,
  createdAt: n.createdAt.toISOString(),
});

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notify(userIds: string | (string | null | undefined)[], input: NotifyInput) {
    const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter((id): id is string => Boolean(id)))];
    if (!ids.length) return;
    try {
      let targets = ids;
      if (input.forumId && SUBSCRIBABLE.has(input.type)) {
        const prefs = await this.prisma.alertPreference.findMany({ where: { forumId: input.forumId, userId: { in: ids } } });
        const off = new Set(
          prefs.filter((p) => (p.data as { subscribe?: string } | null)?.subscribe === 'off').map((p) => p.userId),
        );
        targets = ids.filter((id) => !off.has(id));
      }
      if (!targets.length) return;
      await this.prisma.notification.createMany({
        data: targets.map((userId) => ({
          userId,
          type: input.type,
          title: input.title.slice(0, 200),
          body: (input.body ?? '').slice(0, 500),
          forumId: input.forumId ?? null,
          topicId: input.topicId ?? null,
          questionId: input.questionId ?? null,
        })),
      });
    } catch (error) {
      this.logger.error(`Could not save notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async list(user: AuthUser) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return { unread, items: items.map(toNotificationDto) };
  }

  async markRead(user: AuthUser, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return this.list(user);
  }

  async markAllRead(user: AuthUser) {
    await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return this.list(user);
  }

  async getAlerts(user: AuthUser, forumId: string) {
    await this.assertForum(user, forumId);
    const pref = await this.prisma.alertPreference.findUnique({ where: { userId_forumId: { userId: user.id, forumId } } });
    return { ...DEFAULT_ALERTS, ...((pref?.data ?? {}) as object) };
  }

  async saveAlerts(user: AuthUser, forumId: string, dto: AlertPreferencesDto) {
    await this.assertForum(user, forumId);
    const data = { ...dto } as unknown as Prisma.InputJsonValue;
    await this.prisma.alertPreference.upsert({
      where: { userId_forumId: { userId: user.id, forumId } },
      create: { userId: user.id, forumId, data },
      update: { data },
    });
    return this.getAlerts(user, forumId);
  }

  private async assertForum(user: AuthUser, forumId: string) {
    const forum = await this.prisma.forum.findUnique({ where: { id: forumId } });
    if (!forum) throw new NotFoundException('Forum not found');
    if (user.role === 'CREATOR') return;
    const enrollment = await this.prisma.enrollment.findUnique({ where: { forumId_userId: { forumId, userId: user.id } } });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this forum');
  }
}