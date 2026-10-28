import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { AnswerQuestionDto, CreateQuestionDto } from './dto/question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Roles('LEARNER')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuestionDto) {
    return this.questions.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.questions.list(user);
  }

  @Get(':questionId')
  get(@CurrentUser() user: AuthUser, @Param('questionId') questionId: string) {
    return this.questions.get(user, questionId);
  }

  @Roles('CREATOR')
  @Post(':questionId/answer')
  answer(@CurrentUser() user: AuthUser, @Param('questionId') questionId: string, @Body() dto: AnswerQuestionDto) {
    return this.questions.answer(user, questionId, dto);
  }
}