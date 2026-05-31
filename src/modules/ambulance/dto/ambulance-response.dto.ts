import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AmbulanceBookingStatus,
  AmbulanceStatus,
  AmbulanceVehicleType,
  DriverStatus,
  HealthCenterType,
} from '@prisma/client';

export class HealthCenterBriefDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() address: string;
  @ApiProperty() city: string;
  @ApiProperty() state: string;
  @ApiProperty() zipCode: string;
  @ApiProperty() phone: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: HealthCenterType }) type: HealthCenterType;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
}

export class AmbulanceBriefDto {
  @ApiProperty() id: string;
  @ApiProperty() vehicleNumber: string;
  @ApiProperty({ enum: AmbulanceVehicleType }) vehicleType: AmbulanceVehicleType;
  @ApiProperty({ enum: AmbulanceStatus }) status: AmbulanceStatus;
  @ApiPropertyOptional() latitude: number | null;
  @ApiPropertyOptional() longitude: number | null;
  @ApiProperty() healthCenterId: string;
}

export class DriverBriefDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() licenseNumber: string;
  @ApiProperty({ enum: DriverStatus }) status: DriverStatus;
  @ApiProperty() healthCenterId: string;
}

export class BookingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() patientId: string;
  @ApiPropertyOptional() ambulanceId: string | null;
  @ApiPropertyOptional() driverId: string | null;
  @ApiProperty({ enum: AmbulanceBookingStatus }) status: AmbulanceBookingStatus;
  @ApiProperty() pickupAddress: string;
  @ApiProperty() destinationAddress: string;
  @ApiProperty() pickupLatitude: number;
  @ApiProperty() pickupLongitude: number;
  @ApiProperty() destinationLatitude: number;
  @ApiProperty() destinationLongitude: number;
  @ApiPropertyOptional({ enum: AmbulanceVehicleType }) vehicleTypeRequired: AmbulanceVehicleType | null;
  @ApiPropertyOptional() emergencyType: string | null;
  @ApiPropertyOptional() patientCondition: string | null;
  @ApiPropertyOptional() specialRequirements: string | null;
  @ApiPropertyOptional() cancelReason: string | null;
  @ApiProperty() estimatedFare: string;
  @ApiPropertyOptional() actualFare: string | null;
  @ApiPropertyOptional() estimatedDistance: number | null;
  @ApiPropertyOptional() originCenterId: string | null;
  @ApiPropertyOptional() destinationCenterId: string | null;
  @ApiProperty() bookedAt: Date;
  @ApiPropertyOptional() acceptedAt: Date | null;
  @ApiPropertyOptional() arrivedAt: Date | null;
  @ApiPropertyOptional() startedAt: Date | null;
  @ApiPropertyOptional() completedAt: Date | null;
  @ApiPropertyOptional() cancelledAt: Date | null;
  @ApiProperty() createdAt: Date;
}

export class LiveLocationResponseDto {
  @ApiProperty() ambulanceId: string;
  @ApiProperty() bookingId: string;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiPropertyOptional() accuracy: number | null;
  @ApiProperty() recordedAt: string;
  @ApiProperty({ description: 'Whether the location came from live Redis cache or DB fallback' })
  source: 'cache' | 'db';
}

export class ShiftResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() driverId: string;
  @ApiProperty() ambulanceId: string;
  @ApiProperty() healthCenterId: string;
  @ApiProperty() shiftStart: Date;
  @ApiPropertyOptional() shiftEnd: Date | null;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() endedAt: Date | null;
}
