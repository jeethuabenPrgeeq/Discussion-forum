import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const QUESTION_TYPES = ['marks', 'recheck', 'feedback', 'other'] as const;
export const QUESTION_ABOUT = ['overall', 'original', 'reply1', 'reply2', 'feedback'] as const;

export class CreateQuestionDto {
  @IsOptional()
  @IsString()
  forumId?: string;

  @IsOptional()
  @IsString()
  evaluatorId?: string;

  @IsIn(QUESTION_TYPES)
  type!: (typeof QUESTION_TYPES)[number];

  @IsIn(QUESTION_ABOUT)
  about!: (typeof QUESTION_ABOUT)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  part?: string;

  @IsString()
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  emailMe?: boolean;

  @IsOptional()
  @IsBoolean()
  sendCopy?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class AnswerQuestionDto {
  @IsString()
  @MaxLength(10000)
  body!: string;
}