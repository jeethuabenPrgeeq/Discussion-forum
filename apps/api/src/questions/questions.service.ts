import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Question, User } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { plainText } from '../common/format';
import { cleanHtml, isBlankHtml } from '../common/sanitize';
import { ForumAccessService } from '../forums/forum-access.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { shortName } from '../posts/post.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentsService, type AttachmentDto } from '../uploads/attachments.service';
import type { AnswerQuestionDto, CreateQuestionDto } from './dto/question.dto';

type QuestionRow = Question & { learner: User; evaluator: User };

const referenceOf = (q: Question) => `Q-${1000 + q.number}`;

const toQuestionDto = (q: QuestionRow, attachments: AttachmentDto[] = []) => ({
  id: q.id,
  reference: referenceOf(q),
  number: q.number,
  forumId: q.forumId,
  learner: shortName(q.learner),
  learnerId: q.learnerId,
  evaluator: shortName(q.evaluator),
  evaluatorId: q.evaluatorId,
  type: q.type,
  about: q.about,
  part: q.part,
  body: q.body,
  emailMe: q.emailMe,
  sendCopy: q.sendCopy,
  status: q.status === 'AWAITING' ? 'awaiting' : 'answered',
  answer: q.answer,
  answeredAt: q.answeredAt?.toISOString() ?? null,
  createdAt: q.createdAt.toISOString(),
  attachments,
});

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ForumAccessService,
    private readonly attachments: AttachmentsService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  async create(user: AuthUser, dto: CreateQuestionDto) {
    if (isBlankHtml(dto.body)) throw new BadRequestException('Type your question before sending');
    let ownerId: string | undefined;
    if (dto.forumId) ownerId = (await this.access.forum(user, dto.forumId)).forum.ownerId;

    const evaluator = dto.evaluatorId
      ? await this.prisma.user.findFirst({ where: { id: dto.evaluatorId, role: 'CREATOR' } })
      : await this.prisma.user.findFirst({
          where: ownerId ? { id: ownerId } : { role: 'CREATOR' },
          orderBy: { createdAt: 'asc' },
        });
    if (!evaluator) throw new BadRequestException('No evaluator is available for this question');

    const question = await this.prisma.question.create({
      data: {
        forumId: dto.forumId ?? null,
        learnerId: user.id,
        evaluatorId: evaluator.id,
        type: dto.type,
        about: dto.about,
        part: dto.part ?? null,
        body: cleanHtml(dto.body),
        emailMe: dto.emailMe ?? true,
        sendCopy: dto.sendCopy ?? false,
      },
      include: { learner: true, evaluator: true },
    });

    const attachments = await this.attachments.linkToQuestion(user.id, question.id, dto.attachmentIds);
    const text = plainText(question.body);

    await this.notifications.notify(evaluator.id, {
      type: 'question',
      title: `${shortName(question.learner)} asked a question (${referenceOf(question)})`,
      body: text.slice(0, 140),
      forumId: question.forumId,
      questionId: question.id,
    });

    if (question.sendCopy) {
      await this.mail.send({
        to: question.learner.email,
        subject: `Your question ${referenceOf(question)} was sent`,
        text: `Hi ${question.learner.firstName},\n\nYou asked ${shortName(evaluator)}:\n\n${text}\n\nYou will be notified when it is answered.`,
      });
    }

    return toQuestionDto(question, attachments);
  }

  async list(user: AuthUser) {
    const questions = await this.prisma.question.findMany({
      where: user.role === 'CREATOR' ? { evaluatorId: user.id } : { learnerId: user.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { learner: true, evaluator: true },
    });
    const files = await this.attachments.forQuestions(questions.map((q) => q.id));
    return questions.map((q) => toQuestionDto(q, files.get(q.id) ?? []));
  }

  async get(user: AuthUser, questionId: string) {
    const question = await this.findQuestion(questionId);
    const allowed = user.role === 'CREATOR' ? question.evaluatorId === user.id : question.learnerId === user.id;
    if (!allowed) throw new ForbiddenException('You cannot view this question');
    const files = await this.attachments.forQuestions([question.id]);
    return toQuestionDto(question, files.get(question.id) ?? []);
  }

  async answer(user: AuthUser, questionId: string, dto: AnswerQuestionDto) {
    const question = await this.findQuestion(questionId);
    if (question.evaluatorId !== user.id) throw new ForbiddenException('Only the assigned evaluator can answer');
    if (isBlankHtml(dto.body)) throw new BadRequestException('Write an answer before sending');
    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: { answer: cleanHtml(dto.body), status: 'ANSWERED', answeredAt: new Date() },
      include: { learner: true, evaluator: true },
    });

    const answerText = plainText(updated.answer ?? '');
    await this.notifications.notify(updated.learnerId, {
      type: 'question-answered',
      title: `${shortName(updated.evaluator)} answered your question (${referenceOf(updated)})`,
      body: answerText.slice(0, 140),
      forumId: updated.forumId,
      questionId: updated.id,
    });

    if (updated.emailMe) {
      await this.mail.send({
        to: updated.learner.email,
        subject: `Your question ${referenceOf(updated)} was answered`,
        text: `Hi ${updated.learner.firstName},\n\nYou asked:\n${plainText(updated.body)}\n\n${shortName(updated.evaluator)} answered:\n${answerText}`,
      });
    }

    const files = await this.attachments.forQuestions([updated.id]);
    return toQuestionDto(updated, files.get(updated.id) ?? []);
  }

  private async findQuestion(questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { learner: true, evaluator: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }
}