import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GeocodingService } from '../../geocoding/geocoding.service';
import {
  GEOCODING_BD_LAT_MAX,
  GEOCODING_BD_LAT_MIN,
  GEOCODING_BD_LNG_MAX,
  GEOCODING_BD_LNG_MIN,
  GEOCODING_CLIENT_DRIFT_KM,
} from '../../geocoding/constants/geocoding.constants';
import { AmbulanceRepository } from '../repositories/ambulance.repository';
import { CreateBookingDto } from '../dto/ambulance-request.dto';
import { FARE_BASE_BDT, FARE_PER_KM_BDT } from '../constants/ambulance.constants';

export interface ResolvedCoordinates {
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
}

@Injectable()
export class BookingCoordinateResolver {
  private readonly logger = new Logger(BookingCoordinateResolver.name);

  constructor(
    private readonly geocoding: GeocodingService,
    private readonly repo: AmbulanceRepository,
  ) {}

  async resolve(
    dto: CreateBookingDto,
    patientId: string,
  ): Promise<ResolvedCoordinates> {
    const pickup = await this.resolvePickup(dto, patientId);
    const destination = await this.resolveDestination(dto, patientId);

    this.assertInBounds(pickup.lat, pickup.lng, 'pickup');
    this.assertInBounds(destination.lat, destination.lng, 'destination');

    return {
      pickupLatitude: pickup.lat,
      pickupLongitude: pickup.lng,
      destinationLatitude: destination.lat,
      destinationLongitude: destination.lng,
    };
  }

  estimateFareKm(coords: ResolvedCoordinates): number {
    return this.haversineKm(
      coords.pickupLatitude,
      coords.pickupLongitude,
      coords.destinationLatitude,
      coords.destinationLongitude,
    );
  }

  estimateFareAmount(distKm: number): number {
    return FARE_BASE_BDT + distKm * FARE_PER_KM_BDT;
  }

  private async resolvePickup(
    dto: CreateBookingDto,
    patientId: string,
  ): Promise<{ lat: number; lng: number }> {
    const hasClientCoords =
      dto.pickupLatitude !== undefined && dto.pickupLongitude !== undefined;

    const geocoded = await this.geocoding.geocode(dto.pickupAddress, patientId);
    if (!geocoded) {
      throw new BadRequestException({
        code: 'PICKUP_ADDRESS_NOT_FOUND',
        message: 'Could not resolve pickup address to coordinates',
      });
    }

    if (!hasClientCoords) {
      return { lat: geocoded.lat, lng: geocoded.lng };
    }

    this.assertInBounds(dto.pickupLatitude!, dto.pickupLongitude!, 'pickup');

    const driftKm = this.haversineKm(
      dto.pickupLatitude!,
      dto.pickupLongitude!,
      geocoded.lat,
      geocoded.lng,
    );

    if (driftKm > GEOCODING_CLIENT_DRIFT_KM) {
      this.logger.warn(
        `Pickup client coords drift ${driftKm.toFixed(2)}km exceeds threshold; using server geocoded coords`,
      );
      return { lat: geocoded.lat, lng: geocoded.lng };
    }

    return { lat: dto.pickupLatitude!, lng: dto.pickupLongitude! };
  }

  private async resolveDestination(
    dto: CreateBookingDto,
    patientId: string,
  ): Promise<{ lat: number; lng: number }> {
    if (dto.destinationCenterId) {
      const center = await this.repo.findHealthCenterById(dto.destinationCenterId);
      if (!center) {
        throw new BadRequestException({
          code: 'DESTINATION_CENTER_NOT_FOUND',
          message: 'Destination health center not found',
        });
      }
      return { lat: center.latitude, lng: center.longitude };
    }

    const hasClientCoords =
      dto.destinationLatitude !== undefined &&
      dto.destinationLongitude !== undefined;

    const geocoded = await this.geocoding.geocode(
      dto.destinationAddress,
      patientId,
    );
    if (!geocoded) {
      throw new BadRequestException({
        code: 'DESTINATION_ADDRESS_NOT_FOUND',
        message: 'Could not resolve destination address to coordinates',
      });
    }

    if (!hasClientCoords) {
      return { lat: geocoded.lat, lng: geocoded.lng };
    }

    this.assertInBounds(
      dto.destinationLatitude!,
      dto.destinationLongitude!,
      'destination',
    );

    const driftKm = this.haversineKm(
      dto.destinationLatitude!,
      dto.destinationLongitude!,
      geocoded.lat,
      geocoded.lng,
    );

    if (driftKm > GEOCODING_CLIENT_DRIFT_KM) {
      this.logger.warn(
        `Destination client coords drift ${driftKm.toFixed(2)}km exceeds threshold; using server geocoded coords`,
      );
      return { lat: geocoded.lat, lng: geocoded.lng };
    }

    return { lat: dto.destinationLatitude!, lng: dto.destinationLongitude! };
  }

  private assertInBounds(
    lat: number,
    lng: number,
    field: 'pickup' | 'destination',
  ): void {
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < GEOCODING_BD_LAT_MIN ||
      lat > GEOCODING_BD_LAT_MAX ||
      lng < GEOCODING_BD_LNG_MIN ||
      lng > GEOCODING_BD_LNG_MAX
    ) {
      throw new BadRequestException({
        code: 'INVALID_COORDINATES',
        message: `${field} coordinates are outside the supported service area`,
      });
    }
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dL = ((lat2 - lat1) * Math.PI) / 180;
    const dN = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dL / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dN / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
