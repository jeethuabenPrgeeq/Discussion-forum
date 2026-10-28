import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma, Topic, TopicRead, User } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { cleanHtml, isBlankHtml } from '../common/sanitize';
import { ForumAccessService } from '../forums/forum-access.service';
import { canSeePost, shortName, toPostDto, WITH_PEOPLE } from '../posts/post.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentsService } from '../uploads/attachments.service';
import type { CreateTopicDto, ListTopicsQuery, MoveTopicDto, UpdateTopicDto } from './dto/topic.dto';

type TopicRow = Topic & { author: User; _count: { posts: number } };

const unreadFor = (topic: Topic, viewerId?: string, read?: TopicRead) => {
  if (!viewerId) return false;
  if (read) return topic.lastActivityAt.getTime() > read.lastReadAt.getTime();
  return topic.authorId !== viewerId;
};

const toTopicDto = (topic: TopicRow, viewerId?: string, read?: TopicRead) => ({
  id: topic.id,
  forumId: topic.forumId,
  title: topic.title,
  createdBy: shortName(topic.author),
  authorId: topic.authorId,
  replies: Math.max(0, topic._count.posts - 1),
  lastActivityAt: topic.lastActivityAt.toISOString(),
  createdAt: topic.createdAt.toISOString(),
  state: topic.state.toLowerCase(),
  isPinned: topic.isPinned,
  isLocked: topic.isLocked,
  participation: topic.participation ? topic.participation.toLowerCase() : null,
  group: topic.group ?? '',
  reportCount: topic.reportCount,
  isUnread: unreadFor(topic, viewerId, read),
});

const ORDER: Record<string, Prisma.TopicOrderByWithRelationInput[]> = {
  latest: [{ isPinned: 'desc' }, { lastActivityAt: 'desc' }],
  oldest: [{ createdAt: 'asc' }],
  replies: [{ posts: { _count: 'desc' } }, { lastActivityAt: 'desc' }],
  az: [{ title: 'asc' }],
};

const COUNT_POSTS = { _count: { select: { posts: { where: { removedAt: null } } } } } as const;

@Injectable()
export class TopicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ForumAccessService,
    private readonly attachments: AttachmentsService,
  ) {}

  async list(user: AuthUser, forumId: string, query: ListTopicsQuery) {
    await this.access.forum(user, forumId);
    const where: Prisma.TopicWhereInput = { forumId };
    if (query.q) where.title = { contains: query.q, mode: 'insensitive' };
    if (query.group && query.group !== 'all') where.group = query.group;

    switch (query.filter) {
      case 'pinned':
        where.isPinned = true;
        break;
      case 'answered':
        where.state = 'ANSWERED';
        break;
      case 'unanswered':
        where.state = 'OPEN';
        break;
      case 'locked':
        where.isLocked = true;
        break;
      case 'reported':
        where.reportCount = { gt: 0 };
        break;
      case 'replyNeeded':
        where.participation = 'REQUIRED';
        break;
      case 'mine':
        where.authorId = user.id;
        break;
    }

    const topics = await this.prisma.topic.findMany({
      where,
      orderBy: ORDER[query.sort ?? 'latest'],
      include: { author: true, ...COUNT_POSTS },
    });
    const reads = await this.prisma.topicRead.findMany({
      where: { userId: user.id, topicId: { in: topics.map((t) => t.id) } },
    });
    const readBy = new Map(reads.map((r) => [r.topicId, r]));
    return topics.map((t) => toTopicDto(t, user.id, readBy.get(t.id)));
  }

  async create(user: AuthUser, forumId: string, dto: CreateTopicDto) {
    const access = await this.access.forum(user, forumId);
    this.access.assertCanPost(access);
    if (!access.isCreator && access.settings.learnersStartTopics === false) {
      throw new ForbiddenException('Only the instructor can start topics in this forum');
    }
    if (isBlankHtml(dto.body)) throw new BadRequestException('Write something before posting');

    const { topic, openingId } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.topic.create({
        data: {
          forumId,
          authorId: user.id,
          title: dto.title,
          group: dto.group || access.enrollment?.group || null,
          state: access.isCreator && dto.state ? (dto.state.toUpperCase() as Topic['state']) : 'OPEN',
          participation: dto.participation ? (dto.participation.toUpperCase() as Topic['participation']) : null,
        },
      });
      const opening = await tx.post.create({ data: { topicId: created.id, authorId: user.id, body: cleanHtml(dto.body) } });
      const full = await tx.topic.findUniqueOrThrow({ where: { id: created.id }, include: { author: true, ...COUNT_POSTS } });
      return { topic: full, openingId: opening.id };
    });

    await this.attachments.link(user.id, openingId, dto.attachmentIds);
    await this.prisma.topicRead.create({ data: { userId: user.id, topicId: topic.id } });
    return toTopicDto(topic);
  }

  async get(user: AuthUser, topicId: string) {
    await this.access.topic(user, topicId);
    const topic = await this.prisma.topic.findUniqueOrThrow({
      where: { id: topicId },
      include: {
        author: true,
        ...COUNT_POSTS,
        posts: { where: { removedAt: null }, orderBy: { createdAt: 'asc' }, include: WITH_PEOPLE },
      },
    });
    const byId = new Map(topic.posts.map((p) => [p.id, p]));
    const visible = user.role === 'CREATOR' ? topic.posts : topic.posts.filter((p) => canSeePost(p, user.id, byId));
    const ids = visible.map((p) => p.id);

    const [files, mine] = await Promise.all([
      this.attachments.forPosts(ids),
      this.prisma.report.findMany({ where: { reporterId: user.id, postId: { in: ids } }, select: { postId: true } }),
      this.prisma.topicRead.upsert({
        where: { userId_topicId: { userId: user.id, topicId } },
        create: { userId: user.id, topicId, lastReadAt: new Date() },
        update: { lastReadAt: new Date() },
      }),
    ]);
    const reported = new Set(mine.map((r) => r.postId));

    return {
      topic: toTopicDto(topic),
      posts: visible.map((p) => ({
        ...toPostDto(p, user),
        attachments: files.get(p.id) ?? [],
        reportedBy: reported.has(p.id) ? [user.id] : [],
      })),
    };
  }

  async update(user: AuthUser, topicId: string, dto: UpdateTopicDto) {
    await this.access.topic(user, topicId);
    const topic = await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        title: dto.title,
        isPinned: dto.isPinned,
        isLocked: dto.isLocked,
        state: dto.state ? (dto.state.toUpperCase() as Topic['state']) : undefined,
        participation:
          dto.participation === undefined
            ? undefined
            : dto.participation === null
              ? null
              : (dto.participation.toUpperCase() as Topic['participation']),
      },
      include: { author: true, ...COUNT_POSTS },
    });
    return toTopicDto(topic);
  }

  async move(user: AuthUser, topicId: string, dto: MoveTopicDto) {
    const { topic } = await this.access.topic(user, topicId);
    if (topic.forumId === dto.forumId) throw new BadRequestException('The topic is already in this week');
    await this.access.forum(user, dto.forumId);
    const moved = await this.prisma.topic.update({
      where: { id: topicId },
      data: { forumId: dto.forumId, isPinned: false },
      include: { author: true, ...COUNT_POSTS },
    });
    return toTopicDto(moved);
  }

  async remove(user: AuthUser, topicId: string) {
    await this.access.topic(user, topicId);
    await this.prisma.$transaction(async (tx) => {
      const posts = await tx.post.findMany({ where: { topicId }, select: { id: true } });
      const postIds = posts.map((p) => p.id);
      await tx.attachment.deleteMany({ where: { postId: { in: postIds } } });
      await tx.report.deleteMany({ where: { postId: { in: postIds } } });
      await tx.topicRead.deleteMany({ where: { topicId } });
      await tx.notification.deleteMany({ where: { topicId } });
      await tx.post.updateMany({ where: { topicId }, data: { replyToId: null } });
      await tx.post.deleteMany({ where: { topicId } });
      await tx.topic.delete({ where: { id: topicId } });
    });
  }
}