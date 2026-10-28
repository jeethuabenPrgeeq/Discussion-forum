import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UploadsModule } from './uploads/uploads.module';
import { ExportsModule } from './exports/exports.module';
import { RemindersModule } from './reminders/reminders.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { MailModule } from './mail/mail.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ForumsModule } from './forums/forums.module';
import { PeopleModule } from './people/people.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './questions/questions.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [NotificationsModule, ScheduleModule.forRoot(), UploadsModule, ExportsModule, RemindersModule, MailModule, EvaluationsModule, 
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ForumsModule,
    PeopleModule,
    ReportsModule,
    QuestionsModule,
  ],
})
export class AppModule {}