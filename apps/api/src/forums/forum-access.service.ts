import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Enrollment, Forum, Topic } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

export interface ForumSettingsJson {
  postDue?: string;
  repliesDue?: string;
  cutoff?: string;
  gradesOut?: string;
  topicsEach?: string;
  repliesEach?: string;
  editWindow?: string;
  learnersStartTopics?: boolean;
  [key: string]: unknown;
}

export interface ForumAccess {
  forum: Forum;
  settings: ForumSettingsJson;
  enrollment: Enrollment | null;
  isCreator: boolean;
}

@Injectable()
export class ForumAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async forum(user: AuthUser, forumId: string): Promise<ForumAccess> {
    const forum = await this.prisma.forum.findUnique({ where: { id: forumId } });
    if (!forum) throw new NotFoundException('Forum not found');
    const settings = (forum.settings ?? {}) as ForumSettingsJson;
    if (user.role === 'CREATOR') return { forum, settings, enrollment: null, isCreator: true };

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { forumId_userId: { forumId, userId: user.id } },
    });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this forum');
    return { forum, settings, enrollment, isCreator: false };
  }

  async topic(user: AuthUser, topicId: string): Promise<ForumAccess & { topic: Topic }> {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');
    const access = await this.forum(user, topic.forumId);
    return { ...access, topic };
  }

  assertCanPost(access: ForumAccess) {
    if (access.isCreator) return;
    if (!access.enrollment?.canPost) throw new ForbiddenException('Posting is turned off for you in this forum');
    if (access.enrollment.role === 'AUDITOR') throw new ForbiddenException('Auditors can read but not post');
  }
}