import { Module } from '@nestjs/common';
import { ForumsModule } from '../forums/forums.module';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

@Module({
  imports: [ForumsModule],
  controllers: [PeopleController],
  providers: [PeopleService],
})
export class PeopleModule {}