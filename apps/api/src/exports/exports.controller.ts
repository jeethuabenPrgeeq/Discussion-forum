import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators';
import { ExportQueryDto } from './dto/export.dto';
import { EXPORT_SECTIONS, ExportsService, type ExportSection } from './exports.service';

@Controller('forums/:forumId/export')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get()
  async export(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Query() query: ExportQueryDto, @Res() res: Response) {
    const requested = (query.sections ?? EXPORT_SECTIONS.join(',')).split(',').map((s) => s.trim());
    const sections = requested.filter((s): s is ExportSection => (EXPORT_SECTIONS as readonly string[]).includes(s));
    const file = await this.exports.build(user, forumId, query.format ?? 'xlsx', sections, {
      group: query.group,
      range: query.range,
      attachments: requested.includes('attachments'),
    });
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }
}