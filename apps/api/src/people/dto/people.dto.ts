import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  group?: string | null;

  @IsOptional()
  @IsIn(['learner', 'observer'])
  role?: 'learner' | 'observer';

  @IsOptional()
  @IsBoolean()
  canPost?: boolean;
}

export class ReminderDto {
  @IsString()
  @MaxLength(80)
  reason!: string;

  @IsIn(['now', 'tomorrow', 'deadline'])
  when!: 'now' | 'tomorrow' | 'deadline';

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsBoolean()
  email!: boolean;

  @IsBoolean()
  inApp!: boolean;
}

export class PersonMessageDto {
  @IsString()
  @MaxLength(150)
  subject!: string;

  @IsString()
  @MaxLength(5000)
  body!: string;

  @IsBoolean()
  email!: boolean;

  @IsBoolean()
  allowReply!: boolean;
}

export class AddPersonDto {
  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(['learner', 'observer'])
  role?: 'learner' | 'observer';

  @IsOptional()
  @IsString()
  @MaxLength(60)
  group?: string | null;
}

export class BulkRowDto extends AddPersonDto {
  @IsIn(['add', 'update', 'remove'])
  action!: 'add' | 'update' | 'remove';
}

export class BulkPeopleDto {
  @IsOptional()
  @IsBoolean()
  sendInvites?: boolean;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkRowDto)
  rows!: BulkRowDto[];
}