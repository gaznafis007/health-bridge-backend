import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { TELEHEALTH_VIDEO_PROVIDER } from './constants/telehealth.constants';
import { MockTelehealthVideoProvider } from './providers/mock-telehealth-video.provider';
import { TelehealthRepository } from './repositories/telehealth.repository';
import { TelehealthController } from './telehealth.controller';
import { TelehealthService } from './telehealth.service';

const logger = new Logger('TelehealthModule');

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [TelehealthController],
  providers: [
    TelehealthService,
    TelehealthRepository,
    MockTelehealthVideoProvider,
    {
      provide: TELEHEALTH_VIDEO_PROVIDER,
      useFactory: (mock: MockTelehealthVideoProvider) => {
        if (process.env.NODE_ENV === 'test') {
          return mock;
        }
        logger.log('Using mock telehealth video provider');
        return mock;
      },
      inject: [MockTelehealthVideoProvider],
    },
  ],
  exports: [TelehealthService],
})
export class TelehealthModule {}
