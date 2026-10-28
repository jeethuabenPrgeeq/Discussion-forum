import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Enrollment, Forum, Post, Topic, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '../common/auth-user';
import { wordCount } from '../common/format';
import { ForumAccessService } from '../forums/forum-access.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AddPersonDto, BulkRowDto, PersonMessageDto, ReminderDto, UpdatePersonDto } from './dto/people.dto';

type EnrollmentRow = Enrollment & { user: User };
type PostRow = Post & { topic: Topic };

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PASSWORD = process.env.DEFAULT_LEARNER_PASSWORD || 'Learner@123';

const nextNineAm = () => {
  const date = new Date(Date.now() + DAY_MS);
  date.setHours(9, 0, 0, 0);
  return date;
};

const fullName = (user: User) => `${user.firstName} ${user.lastName}`.trim();

export interface BulkResult {
  added: number;
  updated: number;
  removed: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ForumAccessService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser, forumId: string) {
    await this.access.forum(user, forumId);
    const [enrollments, posts, evaluations] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { forumId },
        include: { user: true },
        orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
      }),
      this.prisma.post.findMany({
        where: { removedAt: null, topic: { forumId } },
        include: { topic: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.evaluation.findMany({
        where: { forumId, status: { in: ['EVALUATED', 'PUBLISHED'] } },
        select: { learnerId: true, grade: true },
      }),
    ]);

    const openerByTopic = new Map<string, string>();
    for (const post of posts) {
      if (!openerByTopic.has(post.topicId)) openerByTopic.set(post.topicId, post.id);
    }

    const postsByUser = new Map<string, PostRow[]>();
    for (const post of posts) {
      const list = postsByUser.get(post.authorId) ?? [];
      list.push(post);
      postsByUser.set(post.authorId, list);
    }

    const gradeByUser = new Map(evaluations.map((e) => [e.learnerId, e.grade]));

    return enrollments.map((enrollment) =>
      this.toPersonDto(enrollment, postsByUser.get(enrollment.userId) ?? [], openerByTopic, gradeByUser.get(enrollment.userId) ?? null),
    );
  }

  async add(user: AuthUser, forumId: string, dto: AddPersonDto) {
    await this.access.forum(user, forumId);
    const forum = await this.prisma.forum.findUniqueOrThrow({ where: { id: forumId } });
    const result = await this.addOne(forum, dto, dto.sendInvite !== false);
    if (result === 'exists') throw new ConflictException('This person is already in the forum');
    return (await this.list(user, forumId)).find((p) => p.id === result);
  }

  async bulk(user: AuthUser, forumId: string, rows: BulkRowDto[], sendInvites = true): Promise<BulkResult> {
    await this.access.forum(user, forumId);
    const forum = await this.prisma.forum.findUniqueOrThrow({ where: { id: forumId } });
    const result: BulkResult = { added: 0, updated: 0, removed: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const email = row.email.trim().toLowerCase();
      try {
        if (row.action === 'add') {
          const added = await this.addOne(forum, row, sendInvites);
          if (added === 'exists') {
            result.skipped += 1;
            result.errors.push(`${email}: already in the forum`);
          } else {
            result.added += 1;
          }
          continue;
        }

        const account = await this.prisma.user.findUnique({ where: { email } });
        const enrollment = account
          ? await this.prisma.enrollment.findUnique({ where: { forumId_userId: { forumId, userId: account.id } } })
          : null;
        if (!account || !enrollment) {
          result.skipped += 1;
          result.errors.push(`${email}: not in the forum`);
          continue;
        }

        if (row.action === 'remove') {
          await this.prisma.enrollment.delete({ where: { id: enrollment.id } });
          result.removed += 1;
        } else {
          await this.prisma.enrollment.update({
            where: { id: enrollment.id },
            data: {
              group: row.group === undefined ? undefined : row.group?.trim() || null,
              role: row.role ? (row.role === 'observer' ? 'AUDITOR' : 'LEARNER') : undefined,
            },
          });
          result.updated += 1;
        }
      } catch (error) {
        result.skipped += 1;
        result.errors.push(`${email}: ${error instanceof Error ? error.message : 'could not be processed'}`);
      }
    }

    return result;
  }

  async update(user: AuthUser, forumId: string, userId: string, dto: UpdatePersonDto) {
    await this.access.forum(user, forumId);
    await this.findEnrollment(forumId, userId);
    await this.prisma.enrollment.update({
      where: { forumId_userId: { forumId, userId } },
      data: {
        group: dto.group === undefined ? undefined : dto.group?.trim() || null,
        role: dto.role ? (dto.role === 'observer' ? 'AUDITOR' : 'LEARNER') : undefined,
        canPost: dto.canPost,
      },
    });
    return (await this.list(user, forumId)).find((p) => p.id === userId);
  }

  async remove(user: AuthUser, forumId: string, userId: string) {
    await this.access.forum(user, forumId);
    await this.findEnrollment(forumId, userId);
    await this.prisma.enrollment.delete({ where: { forumId_userId: { forumId, userId } } });
  }

  async remind(user: AuthUser, forumId: string, userId: string, dto: ReminderDto) {
    const { settings } = await this.access.forum(user, forumId);
    const enrollment = await this.findEnrollment(forumId, userId);
    if (!dto.email && !dto.inApp) throw new BadRequestException('Choose email, in-app notification or both');

    let scheduledFor = new Date();
    if (dto.when === 'tomorrow') scheduledFor = nextNineAm();
    if (dto.when === 'deadline') {
      const due = new Date(String(settings.repliesDue ?? settings.postDue ?? ''));
      if (!Number.isNaN(due.getTime())) scheduledFor = new Date(Math.max(Date.now(), due.getTime() - DAY_MS));
    }
    const sendNow = dto.when === 'now' || scheduledFor.getTime() <= Date.now();

    const [reminder] = await this.prisma.$transaction([
      this.prisma.reminder.create({
        data: {
          forumId,
          senderId: user.id,
          recipientId: userId,
          reason: dto.reason,
          timing: dto.when === 'now' ? 'NOW' : dto.when === 'tomorrow' ? 'TOMORROW' : 'DEADLINE',
          message: dto.message.trim(),
          email: dto.email,
          inApp: dto.inApp,
          scheduledFor,
          sentAt: sendNow ? new Date() : null,
        },
      }),
      this.prisma.enrollment.update({ where: { forumId_userId: { forumId, userId } }, data: { remindedAt: new Date() } }),
    ]);

    if (sendNow) {
      if (dto.email) {
        await this.mail.send({
          to: enrollment.user.email,
          subject: `Reminder: ${dto.reason}`,
          text: `Hi ${enrollment.user.firstName},\n\n${dto.message.trim()}`,
        });
      }
      if (dto.inApp) {
        await this.notifications.notify(userId, { type: 'reminder', title: `Reminder: ${dto.reason}`, body: dto.message.trim(), forumId });
      }
    }

    return { id: reminder.id, scheduledFor: reminder.scheduledFor.toISOString(), sent: reminder.sentAt !== null };
  }

  async message(user: AuthUser, forumId: string, userId: string, dto: PersonMessageDto) {
    await this.access.forum(user, forumId);
    const enrollment = await this.findEnrollment(forumId, userId);
    const message = await this.prisma.personMessage.create({
      data: {
        forumId,
        senderId: user.id,
        recipientId: userId,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        emailCopy: dto.email,
        allowReply: dto.allowReply,
      },
      include: { sender: true },
    });

    await this.notifications.notify(userId, {
      type: 'message',
      title: `${fullName(message.sender)}: ${message.subject}`,
      body: message.body,
      forumId,
    });

    if (dto.email) {
      await this.mail.send({
        to: enrollment.user.email,
        subject: message.subject,
        text: `Hi ${enrollment.user.firstName},\n\n${message.body}\n\n-- ${fullName(message.sender)}`,
        replyTo: dto.allowReply ? message.sender.email : undefined,
      });
    }

    return { id: message.id, createdAt: message.createdAt.toISOString() };
  }

  private async addOne(forum: Forum, row: AddPersonDto, sendInvite = true): Promise<string | 'exists'> {
    const email = row.email.trim().toLowerCase();
    let account = await this.prisma.user.findUnique({ where: { email } });
    if (account?.role === 'CREATOR') throw new BadRequestException(`${email} is an instructor account`);

    let created = false;
    if (!account) {
      const firstName = row.firstName?.trim();
      if (!firstName) throw new BadRequestException(`First name is required for ${email}`);
      account = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName: row.lastName?.trim() ?? '',
          role: 'LEARNER',
          passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10),
        },
      });
      created = true;
    }

    const existing = await this.prisma.enrollment.findUnique({ where: { forumId_userId: { forumId: forum.id, userId: account.id } } });
    if (existing) return 'exists';

    await this.prisma.enrollment.create({
      data: {
        forumId: forum.id,
        userId: account.id,
        role: row.role === 'observer' ? 'AUDITOR' : 'LEARNER',
        group: row.group?.trim() || null,
      },
    });

    await this.notifications.notify(account.id, {
      type: 'enrolled',
      title: `You were added to ${forum.title}`,
      body: `${forum.weekLabel} - ${forum.course}`,
      forumId: forum.id,
    });

    if (!sendInvite) return account.id;
    const signIn = created ? `\n\nSign in with:\nEmail: ${email}\nPassword: ${DEFAULT_PASSWORD}` : '';
    await this.mail.send({
      to: email,
      subject: `You've been added to "${forum.title}"`,
      text: `Hi ${account.firstName},\n\nYou now have access to ${forum.weekLabel} - ${forum.title} (${forum.course}).${signIn}`,
    });

    return account.id;
  }

  private async findEnrollment(forumId: string, userId: string): Promise<EnrollmentRow> {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { forumId_userId: { forumId, userId } }, include: { user: true } });
    if (!enrollment) throw new NotFoundException('This person is not in the forum');
    return enrollment;
  }

  private toPersonDto(enrollment: EnrollmentRow, posts: PostRow[], openerByTopic: Map<string, string>, grade: number | null) {
    return {
      id: enrollment.userId,
      firstName: enrollment.user.firstName,
      lastName: enrollment.user.lastName,
      email: enrollment.user.email,
      role: enrollment.role === 'AUDITOR' ? 'observer' : 'learner',
      group: enrollment.group,
      grade,
      canPost: enrollment.canPost,
      reminder: enrollment.remindedAt !== null,
      warnings: enrollment.warnings,
      deductions: enrollment.deductions,
      accessStarts: '',
      accessEnds: '',
      posts: posts.map((post) => ({
        id: post.id,
        topicId: post.topicId,
        kind: openerByTopic.get(post.topicId) === post.id ? 'topic' : 'reply',
        title: post.topic.title,
        createdAt: post.createdAt.toISOString(),
        words: wordCount(post.body),
      })),
    };
  }
}