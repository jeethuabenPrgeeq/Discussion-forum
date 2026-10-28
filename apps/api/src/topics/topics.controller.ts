import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { CreatePostDto } from '../posts/dto/post.dto';
import { PostsService } from '../posts/posts.service';
import { MoveTopicDto, UpdateTopicDto } from './dto/topic.dto';
import { TopicsService } from './topics.service';

@Controller('topics')
export class TopicsController {
  constructor(
    private readonly topics: TopicsService,
    private readonly posts: PostsService,
  ) {}

  @Get(':topicId')
  get(@CurrentUser() user: AuthUser, @Param('topicId') topicId: string) {
    return this.topics.get(user, topicId);
  }

  @Roles('CREATOR')
  @Patch(':topicId')
  update(@CurrentUser() user: AuthUser, @Param('topicId') topicId: string, @Body() dto: UpdateTopicDto) {
    return this.topics.update(user, topicId, dto);
  }

  @Roles('CREATOR')
  @Post(':topicId/move')
  @HttpCode(200)
  move(@CurrentUser() user: AuthUser, @Param('topicId') topicId: string, @Body() dto: MoveTopicDto) {
    return this.topics.move(user, topicId, dto);
  }

  @Roles('CREATOR')
  @Delete(':topicId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('topicId') topicId: string) {
    return this.topics.remove(user, topicId);
  }

  @Post(':topicId/posts')
  createPost(@CurrentUser() user: AuthUser, @Param('topicId') topicId: string, @Body() dto: CreatePostDto) {
    return this.posts.create(user, topicId, dto);
  }
}