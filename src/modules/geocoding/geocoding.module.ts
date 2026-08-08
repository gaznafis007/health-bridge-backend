import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GEOCODING_PROVIDER } from './constants/geocoding.constants';
import { GeocodingController } from './geocoding.controller';
import { GeocodingService } from './geocoding.service';
import { GoogleMapsGeocodingProvider } from './providers/google-maps-geocoding.provider';
import { MockGeocodingProvider } from './providers/mock-geocoding.provider';

const logger = new Logger('GeocodingModule');

@Module({
  imports: [AuthModule],
  controllers: [GeocodingController],
  providers: [
    GeocodingService,
    MockGeocodingProvider,
    {
      provide: GEOCODING_PROVIDER,
      useFactory: (mock: MockGeocodingProvider) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (process.env.NODE_ENV === 'test' || !apiKey) {
          if (process.env.NODE_ENV !== 'test' && !apiKey) {
            logger.warn(
              'GOOGLE_MAPS_API_KEY not set; using mock geocoding provider',
            );
          }
          return mock;
        }
        return new GoogleMapsGeocodingProvider();
      },
      inject: [MockGeocodingProvider],
    },
  ],
  exports: [GeocodingService, GEOCODING_PROVIDER],
})
export class GeocodingModule {}
