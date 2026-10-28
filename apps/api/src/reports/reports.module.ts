import { Module } from '@nestjs/common';
import { ForumsModule } from '../forums/forums.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ForumsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}