import { IsIn, IsNumber, IsObject, IsOptional, Max, Min } from 'class-validator';

export class SaveEvaluationDto {
  @IsIn(['pending', 'draft', 'evaluated', 'published'])
  status!: 'pending' | 'draft' | 'evaluated' | 'published';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  grade?: number | null;

  @IsObject()
  data!: Record<string, unknown>;
}