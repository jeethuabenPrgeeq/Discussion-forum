import { Module } from '@nestjs/common';
import { PostsController } from '../posts/posts.controller';
import { PostsService } from '../posts/posts.service';
import { TopicsController } from '../topics/topics.controller';
import { TopicsService } from '../topics/topics.service';
import { ForumAccessService } from './forum-access.service';
import { ForumSettingsController } from './forum-settings.controller';
import { ForumsController } from './forums.controller';
import { ForumsService } from './forums.service';

@Module({
  controllers: [ForumsController, ForumSettingsController, TopicsController, PostsController],
  providers: [ForumAccessService, ForumsService, TopicsService, PostsService],
  exports: [ForumAccessService],
})
export class ForumsModule {}