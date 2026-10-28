import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReminderDispatcher } from './reminder-dispatcher.service';

@Module({
  imports: [PrismaModule],
  providers: [ReminderDispatcher],
})
export class RemindersModule {}