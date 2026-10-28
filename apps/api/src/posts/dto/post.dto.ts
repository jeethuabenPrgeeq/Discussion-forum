import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(20000)
  body!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  allowReplyBack?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class UpdatePostDto {
  @IsString()
  @MaxLength(20000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  editReason?: string;

  @IsOptional()
  @IsBoolean()
  hideEditTag?: boolean;
}

export class BestAnswerDto {
  @IsOptional()
  @IsInt()
  @IsIn([0, 1, 2, 5])
  @Min(0)
  @Max(5)
  bonusMarks?: number;

  @IsOptional()
  @IsBoolean()
  markAnswered?: boolean;
}

export class FeedbackDto {
  @IsIn(['great', 'good', 'needs_work'])
  rating!: 'great' | 'good' | 'needs_work';

  @IsString()
  @MaxLength(60)
  criterion!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  max!: number;

  @IsOptional()
  @Min(0)
  @Max(100)
  marks?: number | null;

  @IsString()
  @MaxLength(2000)
  note!: string;

  @IsBoolean()
  visible!: boolean;
}