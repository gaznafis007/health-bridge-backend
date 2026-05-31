import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { LabTestController, LabPublicController } from './lab-test.controller';
import { LabTestService } from './lab-test.service';
import { LabTestRepository } from './repositories/lab-test.repository';

@Module({
  imports: [
    AuthModule,
    NotificationModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [LabTestController, LabPublicController],
  providers: [LabTestService, LabTestRepository],
  exports: [LabTestService],
})
export class LabTestModule {}
