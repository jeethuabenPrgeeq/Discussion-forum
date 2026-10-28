import { IsBoolean, IsIn } from 'class-validator';

export class AlertPreferencesDto {
  @IsIn(['all', 'mine', 'off'])
  subscribe!: 'all' | 'mine' | 'off';

  @IsIn(['daily', 'weekly', 'off'])
  digest!: 'daily' | 'weekly' | 'off';

  @IsIn(['replies', 'feedback', 'grade'])
  tellWhen!: 'replies' | 'feedback' | 'grade';

  @IsBoolean()
  autoRead!: boolean;
}