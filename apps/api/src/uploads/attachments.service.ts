import { Injectable } from '@nestjs/common';
import type { Attachment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const toAttachmentDto = (a: Attachment) => ({
  id: a.id,
  name: a.name,
  size: a.size,
  mime: a.mime,
  url: `/files/${a.id}`,
});

export type AttachmentDto = ReturnType<typeof toAttachmentDto>;

const group = (files: Attachment[], key: (a: Attachment) => string | null) => {
  const map = new Map<string, AttachmentDto[]>();
  for (const file of files) {
    const id = key(file);
    if (!id) continue;
    const list = map.get(id) ?? [];
    list.push(toAttachmentDto(file));
    map.set(id, list);
  }
  return map;
};

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async link(userId: string, postId: string, ids: string[] | undefined): Promise<AttachmentDto[]> {
    if (ids?.length) {
      await this.prisma.attachment.updateMany({
        where: { id: { in: ids }, uploaderId: userId, postId: null, questionId: null },
        data: { postId },
      });
    }
    const files = await this.prisma.attachment.findMany({ where: { postId }, orderBy: { createdAt: 'asc' } });
    return files.map(toAttachmentDto);
  }

  async linkToQuestion(userId: string, questionId: string, ids: string[] | undefined): Promise<AttachmentDto[]> {
    if (ids?.length) {
      await this.prisma.attachment.updateMany({
        where: { id: { in: ids }, uploaderId: userId, postId: null, questionId: null },
        data: { questionId },
      });
    }
    const files = await this.prisma.attachment.findMany({ where: { questionId }, orderBy: { createdAt: 'asc' } });
    return files.map(toAttachmentDto);
  }

  async forPosts(postIds: string[]): Promise<Map<string, AttachmentDto[]>> {
    if (!postIds.length) return new Map();
    const files = await this.prisma.attachment.findMany({ where: { postId: { in: postIds } }, orderBy: { createdAt: 'asc' } });
    return group(files, (a) => a.postId);
  }

  async forQuestions(questionIds: string[]): Promise<Map<string, AttachmentDto[]>> {
    if (!questionIds.length) return new Map();
    const files = await this.prisma.attachment.findMany({
      where: { questionId: { in: questionIds } },
      orderBy: { createdAt: 'asc' },
    });
    return group(files, (a) => a.questionId);
  }
}