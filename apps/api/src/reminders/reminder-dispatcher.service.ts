import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReminderDispatcher {
  private readonly logger = new Logger(ReminderDispatcher.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatch() {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.prisma.reminder.findMany({
        where: { sentAt: null, scheduledFor: { lte: new Date() } },
        include: { recipient: true, forum: true },
        orderBy: { scheduledFor: 'asc' },
        take: 50,
      });
      for (const reminder of due) {
        if (reminder.email) {
          await this.mail.send({
            to: reminder.recipient.email,
            subject: `Reminder: ${reminder.reason}`,
            text: `Hi ${reminder.recipient.firstName},\n\n${reminder.message}\n\n${reminder.forum.weekLabel} - ${reminder.forum.title}`,
          });
        }
        if (reminder.inApp) {
          await this.notifications.notify(reminder.recipientId, {
            type: 'reminder',
            title: `Reminder: ${reminder.reason}`,
            body: reminder.message,
            forumId: reminder.forumId,
          });
        }
        await this.prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } });
      }
      if (due.length) this.logger.log(`Sent ${due.length} scheduled reminder(s)`);
    } catch (error) {
      this.logger.error(`Reminder dispatch failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
    }
  }
}