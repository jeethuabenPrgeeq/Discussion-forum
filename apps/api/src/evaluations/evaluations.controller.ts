import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { SaveEvaluationDto } from './dto/evaluation.dto';
import { EvaluationsService } from './evaluations.service';

@Controller('forums/:forumId/evaluations')
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('forumId') forumId: string) {
    return this.evaluations.list(user, forumId);
  }

  @Roles('CREATOR')
  @Put(':userId')
  save(
    @CurrentUser() user: AuthUser,
    @Param('forumId') forumId: string,
    @Param('userId') userId: string,
    @Body() dto: SaveEvaluationDto,
  ) {
    return this.evaluations.save(user, forumId, userId, dto);
  }
}