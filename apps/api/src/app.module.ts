import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TopicsModule } from './forum/topics/topics.module';
import { PostsModule } from './forum/posts/posts.module';
import { SettingsModule } from './forum/settings/settings.module';
import { ParticipantsModule } from './forum/participants/participants.module';
import { GradingModule } from './forum/grading/grading.module';
import { ReportsModule } from './forum/reports/reports.module';
import { AccessModule } from './forum/access/access.module';
import { AlertsModule } from './forum/alerts/alerts.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TopicsModule,
    PostsModule,
    SettingsModule,
    ParticipantsModule,
    GradingModule,
    ReportsModule,
    AccessModule,
    AlertsModule,
  ],
})
export class AppModule {}