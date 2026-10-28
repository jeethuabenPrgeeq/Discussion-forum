import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttachmentsService } from './attachments.service';
import { UploadsController } from './uploads.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class UploadsModule {}