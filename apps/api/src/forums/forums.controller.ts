import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators';
import { CreateTopicDto, ListTopicsQuery } from '../topics/dto/topic.dto';
import { TopicsService } from '../topics/topics.service';
import { ForumsService } from './forums.service';

@Controller('forums')
export class ForumsController {
  constructor(
    private readonly forums: ForumsService,
    private readonly topics: TopicsService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.forums.list(user);
  }

  @Get(':forumId')
  get(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string) {
    return this.forums.get(user, forumId);
  }

  @Get(':forumId/topics')
  topicsList(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Query() query: ListTopicsQuery) {
    return this.topics.list(user, forumId, query);
  }

  @Post(':forumId/topics')
  createTopic(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Body() dto: CreateTopicDto) {
    return this.topics.create(user, forumId, dto);
  }
}