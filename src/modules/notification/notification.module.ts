import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../../common/mail/mail.module';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor, NotificationRepository],
  exports: [NotificationService],
})
export class NotificationModule {}
