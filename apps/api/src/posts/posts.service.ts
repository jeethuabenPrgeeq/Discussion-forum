import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { cleanHtml, isBlankHtml } from '../common/sanitize';
import { ForumAccessService } from '../forums/forum-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentsService } from '../uploads/attachments.service';
import type { BestAnswerDto, CreatePostDto, FeedbackDto, UpdatePostDto } from './dto/post.dto';
import { shortName, toPostDto, WITH_PEOPLE, type PostWithPeople } from './post.mapper';

const DEFAULT_EDIT_WINDOW_MIN = 30;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ForumAccessService,
    private readonly attachments: AttachmentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthUser, topicId: string, dto: CreatePostDto) {
    const access = await this.access.topic(user, topicId);
    const { topic } = access;
    this.access.assertCanPost(access);
    if (isBlankHtml(dto.body)) throw new BadRequestException('Write something before posting');

    if (!access.isCreator) {
      if (topic.isLocked) throw new ForbiddenException('This topic is locked');
      if (topic.state === 'NOTICE') throw new ForbiddenException('Replies are turned off for notices');
    }

    const target = dto.replyToId ? await this.prisma.post.findFirst({ where: { id: dto.replyToId, topicId } }) : null;
    if (dto.replyToId && !target) throw new BadRequestException('The post you are replying to no longer exists');

    let isPrivate = false;
    if (access.isCreator) {
      if (dto.isPrivate && !target) throw new BadRequestException('A private reply needs a post to reply to');
      isPrivate = !!dto.isPrivate;
    } else if (target?.isPrivate) {
      const targetParent = target.replyToId ? await this.prisma.post.findUnique({ where: { id: target.replyToId } }) : null;
      const involved = target.authorId === user.id || targetParent?.authorId === user.id;
      if (!involved) throw new ForbiddenException('You cannot reply to this message');
      if (!target.allowReplyBack) throw new ForbiddenException('Replies are turned off for this message');
      isPrivate = true;
    }

    const [post] = await this.prisma.$transaction([
      this.prisma.post.create({
        data: {
          topicId,
          authorId: user.id,
          body: cleanHtml(dto.body),
          replyToId: target?.id ?? null,
          isPrivate,
          allowReplyBack: isPrivate ? (dto.allowReplyBack ?? true) : true,
        },
        include: WITH_PEOPLE,
      }),
      this.prisma.topic.update({ where: { id: topicId }, data: { lastActivityAt: new Date() } }),
    ]);

    const attachments = await this.attachments.link(user.id, post.id, dto.attachmentIds);
    const recipients = isPrivate ? [target?.authorId] : [topic.authorId, target?.authorId];
    await this.notifications.notify(
      recipients.filter((id) => id && id !== user.id),
      {
        type: 'reply',
        title: isPrivate ? `${shortName(post.author)} sent you a private reply` : `${shortName(post.author)} replied`,
        body: topic.title,
        forumId: topic.forumId,
        topicId,
      },
    );

    return { ...toPostDto(post, user), attachments };
  }

  async update(user: AuthUser, postId: string, dto: UpdatePostDto) {
    const post = await this.findPost(postId);
    const access = await this.access.topic(user, post.topicId);
    if (isBlankHtml(dto.body)) throw new BadRequestException('The post cannot be empty');

    if (!access.isCreator) {
      if (post.authorId !== user.id) throw new ForbiddenException('You can only edit your own posts');
      if (access.topic.isLocked) throw new ForbiddenException('This topic is locked');
      const windowMin = Number.parseInt(String(access.settings.editWindow ?? ''), 10) || DEFAULT_EDIT_WINDOW_MIN;
      if (Date.now() - post.createdAt.getTime() > windowMin * 60_000) {
        throw new ForbiddenException(`Posts can only be edited within ${windowMin} minutes`);
      }
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        body: cleanHtml(dto.body),
        editedAt: new Date(),
        editedById: user.id,
        editReason: access.isCreator ? (dto.editReason ?? null) : null,
        hideEditTag: access.isCreator ? !!dto.hideEditTag : false,
      },
      include: WITH_PEOPLE,
    });
    return this.withFiles(updated, user);
  }

  async remove(user: AuthUser, postId: string) {
    const post = await this.findPost(postId);
    await this.access.topic(user, post.topicId);
    await this.prisma.post.delete({ where: { id: postId } });
  }

  async setBestAnswer(user: AuthUser, postId: string, dto: BestAnswerDto) {
    const post = await this.findPost(postId);
    const { topic } = await this.access.topic(user, post.topicId);

    await this.prisma.$transaction([
      this.prisma.post.updateMany({ where: { topicId: topic.id, isBestAnswer: true }, data: { isBestAnswer: false, bonusMarks: null } }),
      this.prisma.post.update({ where: { id: postId }, data: { isBestAnswer: true, bonusMarks: dto.bonusMarks || null } }),
      this.prisma.topic.update({
        where: { id: topic.id },
        data: { state: dto.markAnswered && topic.state !== 'NOTICE' ? 'ANSWERED' : topic.state },
      }),
    ]);

    if (!post.isBestAnswer && post.authorId !== user.id) {
      await this.notifications.notify(post.authorId, {
        type: 'best-answer',
        title: dto.bonusMarks ? `Your post was marked best answer (+${dto.bonusMarks} bonus)` : 'Your post was marked best answer',
        body: topic.title,
        forumId: topic.forumId,
        topicId: topic.id,
      });
    }
    return this.postDto(postId, user);
  }

  async clearBestAnswer(user: AuthUser, postId: string) {
    const post = await this.findPost(postId);
    const { topic } = await this.access.topic(user, post.topicId);

    await this.prisma.$transaction([
      this.prisma.post.update({ where: { id: postId }, data: { isBestAnswer: false, bonusMarks: null } }),
      this.prisma.topic.update({ where: { id: topic.id }, data: { state: topic.state === 'ANSWERED' ? 'OPEN' : topic.state } }),
    ]);
    return this.postDto(postId, user);
  }

  async saveFeedback(user: AuthUser, postId: string, dto: FeedbackDto) {
    const post = await this.findPost(postId);
    const { topic } = await this.access.topic(user, post.topicId);
    if (dto.marks != null && dto.marks > dto.max) throw new BadRequestException(`Marks cannot be more than ${dto.max}`);
    if (!dto.note.trim()) throw new BadRequestException('Write a next step for the learner');

    const data = {
      authorId: user.id,
      rating: dto.rating.toUpperCase() as 'GREAT' | 'GOOD' | 'NEEDS_WORK',
      criterion: dto.criterion,
      max: dto.max,
      marks: dto.marks ?? null,
      note: dto.note.trim(),
      visible: dto.visible,
    };
    await this.prisma.postFeedback.upsert({ where: { postId }, create: { postId, ...data }, update: data });

    if (dto.visible && post.authorId !== user.id) {
      await this.notifications.notify(post.authorId, {
        type: 'feedback',
        title: 'New feedback on your post',
        body: topic.title,
        forumId: topic.forumId,
        topicId: topic.id,
      });
    }
    return this.postDto(postId, user);
  }

  private async findPost(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.removedAt) throw new NotFoundException('Post not found');
    return post;
  }

  private async withFiles(post: PostWithPeople, user: AuthUser) {
    const files = await this.attachments.forPosts([post.id]);
    return { ...toPostDto(post, user), attachments: files.get(post.id) ?? [] };
  }

  private async postDto(postId: string, user: AuthUser) {
    const post = await this.prisma.post.findUniqueOrThrow({ where: { id: postId }, include: WITH_PEOPLE });
    return this.withFiles(post, user);
  }
}