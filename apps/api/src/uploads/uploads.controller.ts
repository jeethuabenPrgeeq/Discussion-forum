import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Attachment, Post as PostRow, Question, Topic } from '@prisma/client';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { toAttachmentDto } from './attachments.service';
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, UPLOAD_DIR } from './upload.config';

mkdirSync(UPLOAD_DIR, { recursive: true });

type FileRow = Attachment & { post: (PostRow & { topic: Topic }) | null; question: Question | null };

@Controller()
export class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${ALLOWED_TYPES[file.mimetype] ?? extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES[file.mimetype]) cb(null, true);
        else cb(new BadRequestException('Only PDF, DOCX, PNG and JPG files are allowed'), false);
      },
    }),
  )
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Choose a file to upload');
    const saved = await this.prisma.attachment.create({
      data: {
        uploaderId: user.id,
        name: file.originalname.slice(0, 200),
        size: file.size,
        mime: file.mimetype,
        path: file.filename,
      },
    });
    return toAttachmentDto(saved);
  }

  @Get('files/:fileId')
  async download(@CurrentUser() user: AuthUser, @Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.prisma.attachment.findUnique({
      where: { id: fileId },
      include: { post: { include: { topic: true } }, question: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (!(await this.canRead(user, file))) throw new ForbiddenException('You cannot open this file');
    const fullPath = join(UPLOAD_DIR, file.path);
    if (!existsSync(fullPath)) throw new NotFoundException('File not found');
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.sendFile(fullPath);
  }

  private async canRead(user: AuthUser, file: FileRow) {
    if (user.role === 'CREATOR' || file.uploaderId === user.id) return true;
    if (file.question) return file.question.learnerId === user.id || file.question.evaluatorId === user.id;
    if (!file.post || file.post.removedAt || file.post.hiddenAt) return false;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { forumId_userId: { forumId: file.post.topic.forumId, userId: user.id } },
    });
    return enrollment !== null;
  }
}