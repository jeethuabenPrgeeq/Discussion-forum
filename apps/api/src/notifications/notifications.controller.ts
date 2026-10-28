import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators';
import { AlertPreferencesDto } from './dto/alert-preferences.dto';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user);
  }

  @Post('notifications/read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user);
  }

  @Post('notifications/:notificationId/read')
  @HttpCode(200)
  markRead(@CurrentUser() user: AuthUser, @Param('notificationId') notificationId: string) {
    return this.notifications.markRead(user, notificationId);
  }

  @Get('forums/:forumId/alert-preferences')
  getAlerts(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string) {
    return this.notifications.getAlerts(user, forumId);
  }

  @Put('forums/:forumId/alert-preferences')
  saveAlerts(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Body() dto: AlertPreferencesDto) {
    return this.notifications.saveAlerts(user, forumId, dto);
  }
}