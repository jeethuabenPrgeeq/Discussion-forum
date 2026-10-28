import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_REASONS = ['Off-topic', 'Plagiarism', 'Rude language', 'Other'] as const;
export const REPORT_DECISIONS = ['dismiss', 'hide', 'remove-warn', 'remove-deduct'] as const;

export class CreateReportDto {
  @IsIn(REPORT_REASONS)
  reason!: (typeof REPORT_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class ListReportsQuery {
  @IsOptional()
  @IsIn(['pending', 'resolved', 'all'])
  status?: 'pending' | 'resolved' | 'all';
}

export class ResolveReportDto {
  @IsIn(REPORT_DECISIONS)
  decision!: (typeof REPORT_DECISIONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}