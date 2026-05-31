import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AppointmentRepository } from './repositories/appointment.repository';

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentRepository],
})
export class AppointmentModule {}
