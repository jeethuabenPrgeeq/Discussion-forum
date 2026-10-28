import { Injectable } from '@nestjs/common';
import type { Forum, Prisma, User } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { ForumAccessService, type ForumSettingsJson } from './forum-access.service';

const toForumDto = (forum: Forum & { owner: User }) => ({
  id: forum.id,
  weekLabel: forum.weekLabel,
  title: forum.title,
  course: forum.course,
  position: forum.position,
  instructor: `${forum.owner.firstName} ${forum.owner.lastName}`.trim(),
  settings: (forum.settings ?? {}) as ForumSettingsJson,
});

const textOf = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined);

@Injectable()
export class ForumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ForumAccessService,
  ) {}

  async list(user: AuthUser) {
    const forums = await this.prisma.forum.findMany({
      where: user.role === 'CREATOR' ? {} : { enrollments: { some: { userId: user.id } } },
      orderBy: { position: 'asc' },
      include: { owner: true },
    });
    return forums.map(toForumDto);
  }

  async get(user: AuthUser, forumId: string) {
    await this.access.forum(user, forumId);
    const forum = await this.prisma.forum.findUniqueOrThrow({ where: { id: forumId }, include: { owner: true } });
    const [learners, posted] = await Promise.all([
      this.prisma.enrollment.count({ where: { forumId, role: 'LEARNER' } }),
      this.prisma.enrollment.count({
        where: { forumId, role: 'LEARNER', user: { posts: { some: { removedAt: null, topic: { forumId } } } } },
      }),
    ]);
    return { ...toForumDto(forum), stats: { learners, posted } };
  }

  async updateSettings(user: AuthUser, forumId: string, settings: Record<string, unknown>) {
    await this.access.forum(user, forumId);
    const forum = await this.prisma.forum.findUniqueOrThrow({ where: { id: forumId } });
    const merged = { ...((forum.settings ?? {}) as Record<string, unknown>), ...settings };
    await this.prisma.forum.update({
      where: { id: forumId },
      data: {
        settings: merged as Prisma.InputJsonValue,
        title: textOf(settings.name),
        course: textOf(settings.course),
      },
    });
    return this.get(user, forumId);
  }
}