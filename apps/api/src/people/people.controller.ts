import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { AddPersonDto, BulkPeopleDto, PersonMessageDto, ReminderDto, UpdatePersonDto } from './dto/people.dto';
import { PeopleService } from './people.service';

@Controller('forums/:forumId/people')
export class PeopleController {
  constructor(private readonly people: PeopleService) {}

  @Roles('CREATOR')
  @Get()
  list(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string) {
    return this.people.list(user, forumId);
  }

  @Roles('CREATOR')
  @Post()
  add(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Body() dto: AddPersonDto) {
    return this.people.add(user, forumId, dto);
  }

  @Roles('CREATOR')
  @Post('bulk')
  bulk(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Body() dto: BulkPeopleDto) {
    return this.people.bulk(user, forumId, dto.rows, dto.sendInvites !== false);
  }

  @Roles('CREATOR')
  @Patch(':userId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('forumId') forumId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.people.update(user, forumId, userId, dto);
  }

  @Roles('CREATOR')
  @Delete(':userId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string, @Param('userId') userId: string) {
    return this.people.remove(user, forumId, userId);
  }

  @Roles('CREATOR')
  @Post(':userId/reminders')
  remind(
    @CurrentUser() user: AuthUser,
    @Param('forumId') forumId: string,
    @Param('userId') userId: string,
    @Body() dto: ReminderDto,
  ) {
    return this.people.remind(user, forumId, userId, dto);
  }

  @Roles('CREATOR')
  @Post(':userId/messages')
  message(
    @CurrentUser() user: AuthUser,
    @Param('forumId') forumId: string,
    @Param('userId') userId: string,
    @Body() dto: PersonMessageDto,
  ) {
    return this.people.message(user, forumId, userId, dto);
  }
}