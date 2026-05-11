import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AmbulanceController } from './ambulance.controller';
import { AmbulanceService } from './ambulance.service';
import { AmbulanceRepository } from './repositories/ambulance.repository';

@Module({
  imports: [AuthModule],
  controllers: [AmbulanceController],
  providers: [AmbulanceService, AmbulanceRepository],
  exports: [AmbulanceService],
})
export class AmbulanceModule {}
