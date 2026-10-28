import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const TOPIC_FILTERS = ['all', 'pinned', 'answered', 'unanswered', 'locked', 'reported', 'replyNeeded', 'mine'] as const;
export const TOPIC_SORTS = ['latest', 'replies', 'oldest', 'az'] as const;
export const TOPIC_STATES = ['open', 'answered', 'notice'] as const;
export const PARTICIPATION = ['required', 'optional'] as const;

export class ListTopicsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsIn(TOPIC_FILTERS)
  filter?: (typeof TOPIC_FILTERS)[number];

  @IsOptional()
  @IsIn(TOPIC_SORTS)
  sort?: (typeof TOPIC_SORTS)[number];
}

export class CreateTopicDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsString()
  @MaxLength(20000)
  body!: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsIn(TOPIC_STATES)
  state?: (typeof TOPIC_STATES)[number];

  @IsOptional()
  @IsIn(PARTICIPATION)
  participation?: (typeof PARTICIPATION)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsIn(TOPIC_STATES)
  state?: (typeof TOPIC_STATES)[number];

  @IsOptional()
  @IsIn([...PARTICIPATION, null])
  participation?: (typeof PARTICIPATION)[number] | null;
}

export class MoveTopicDto {
  @IsString()
  forumId!: string;
}