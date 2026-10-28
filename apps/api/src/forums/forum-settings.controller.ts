import { Body, Controller, Param, Put } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { UpdateSettingsDto } from './dto/settings.dto';
import { ForumsService } from './forums.service';

@Controller('forums/:forumId/settings')
export class ForumSettingsController {
  constructor(private readonly forums: ForumsService) {}

  @Roles('CREATOR')
  @Put()
  update(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Body() dto: UpdateSettingsDto) {
    return this.forums.updateSettings(user, forumId, dto.settings);
  }
}