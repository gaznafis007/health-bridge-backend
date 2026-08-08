import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { AmbulanceController } from './ambulance.controller';
import { AmbulanceService } from './ambulance.service';
import { AmbulanceRepository } from './repositories/ambulance.repository';
import { BookingCoordinateResolver } from './utils/booking-coordinate.resolver';

@Module({
  imports: [AuthModule, NotificationModule, GeocodingModule],
  controllers: [AmbulanceController],
  providers: [AmbulanceService, AmbulanceRepository, BookingCoordinateResolver],
  exports: [AmbulanceService],
})
export class AmbulanceModule {}
