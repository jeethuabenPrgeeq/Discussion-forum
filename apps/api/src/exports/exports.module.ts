import { Module } from '@nestjs/common';
import { ForumsModule } from '../forums/forums.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [ForumsModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}