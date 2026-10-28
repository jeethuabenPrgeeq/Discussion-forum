import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { CreateReportDto, ListReportsQuery, ResolveReportDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('posts/:postId/reports')
  create(@CurrentUser() user: AuthUser, @Param('postId') postId: string, @Body() dto: CreateReportDto) {
    return this.reports.create(user, postId, dto);
  }

  @Roles('CREATOR')
  @Get('forums/:forumId/reports')
  list(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Query() query: ListReportsQuery) {
    return this.reports.list(user, forumId, query);
  }

  @Roles('CREATOR')
  @Get('reports/:reportId')
  get(@CurrentUser() user: AuthUser, @Param('reportId') reportId: string) {
    return this.reports.get(user, reportId);
  }

  @Roles('CREATOR')
  @Post('reports/:reportId/resolve')
  resolve(@CurrentUser() user: AuthUser, @Param('reportId') reportId: string, @Body() dto: ResolveReportDto) {
    return this.reports.resolve(user, reportId, dto);
  }
}