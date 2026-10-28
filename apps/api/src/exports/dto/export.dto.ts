import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExportQueryDto {
  @IsOptional()
  @IsIn(['xlsx', 'pdf', 'csv'])
  format?: 'xlsx' | 'pdf' | 'csv';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sections?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  group?: string;

  @IsOptional()
  @IsIn(['all', '7d', '30d'])
  range?: 'all' | '7d' | '30d';
}