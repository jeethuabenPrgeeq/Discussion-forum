import { Body, Controller, Delete, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { BestAnswerDto, FeedbackDto, UpdatePostDto } from './dto/post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Patch(':postId')
  update(@CurrentUser() user: AuthUser, @Param('postId') postId: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(user, postId, dto);
  }

  @Roles('CREATOR')
  @Delete(':postId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('postId') postId: string) {
    return this.posts.remove(user, postId);
  }

  @Roles('CREATOR')
  @Post(':postId/best-answer')
  setBestAnswer(@CurrentUser() user: AuthUser, @Param('postId') postId: string, @Body() dto: BestAnswerDto) {
    return this.posts.setBestAnswer(user, postId, dto);
  }

  @Roles('CREATOR')
  @Delete(':postId/best-answer')
  clearBestAnswer(@CurrentUser() user: AuthUser, @Param('postId') postId: string) {
    return this.posts.clearBestAnswer(user, postId);
  }

  @Roles('CREATOR')
  @Put(':postId/feedback')
  saveFeedback(@CurrentUser() user: AuthUser, @Param('postId') postId: string, @Body() dto: FeedbackDto) {
    return this.posts.saveFeedback(user, postId, dto);
  }
}