import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AmbulanceStatus, AmbulanceVehicleType, DriverStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// ─── Health-Center DTOs ────────────────────────────────────────────────────

export class CreateHealthCenterDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  state: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  zipCode: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsLatitude()
  @Type(() => Number)
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  @Type(() => Number)
  longitude: number;

  @ApiProperty({ enum: ['HOSPITAL', 'CLINIC', 'DIAGNOSTIC_CENTER'] })
  @IsEnum(['HOSPITAL', 'CLINIC', 'DIAGNOSTIC_CENTER'])
  type: 'HOSPITAL' | 'CLINIC' | 'DIAGNOSTIC_CENTER';
}

// ─── Ambulance DTOs ────────────────────────────────────────────────────────

export class RegisterAmbulanceDto {
  @ApiProperty()
  @IsUUID()
  healthCenterId: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(20)
  vehicleNumber: string;

  @ApiProperty({ enum: AmbulanceVehicleType })
  @IsEnum(AmbulanceVehicleType)
  vehicleType: AmbulanceVehicleType;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  insuranceNumber?: string;
}

export class UpdateAmbulanceStatusDto {
  @ApiProperty({ enum: AmbulanceStatus })
  @IsEnum(AmbulanceStatus)
  status: AmbulanceStatus;
}

// ─── Driver DTOs ───────────────────────────────────────────────────────────

export class RegisterDriverDto {
  @ApiProperty({ description: 'User ID of the driver (must have DRIVER role)' })
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  healthCenterId: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(50)
  licenseNumber: string;

  @ApiProperty({ example: '2028-01-01' })
  @IsDateString()
  licenseExpiryDate: string;
}

export class UpdateDriverStatusDto {
  @ApiProperty({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  status: DriverStatus;
}

// ─── Shift DTOs ────────────────────────────────────────────────────────────

export class StartShiftDto {
  @ApiProperty({ description: 'Driver profile ID' })
  @IsUUID()
  driverId: string;

  @ApiProperty({ description: 'Ambulance ID to assign for the shift' })
  @IsUUID()
  ambulanceId: string;

  @ApiProperty({ description: 'ISO-8601 shift start datetime' })
  @IsDateString()
  shiftStart: string;

  @ApiPropertyOptional({ description: 'ISO-8601 planned shift end' })
  @IsOptional() @IsDateString()
  shiftEnd?: string;
}

// ─── Booking DTOs (Patient) ────────────────────────────────────────────────

export class CreateBookingDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(500)
  pickupAddress: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(500)
  destinationAddress: string;

  @ApiPropertyOptional({
    description:
      'Optional when pickupAddress is provided; server geocodes address if omitted',
    example: 23.7461,
  })
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  pickupLatitude?: number;

  @ApiPropertyOptional({
    description:
      'Optional when pickupAddress is provided; server geocodes address if omitted',
    example: 90.3742,
  })
  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  pickupLongitude?: number;

  @ApiPropertyOptional({
    description:
      'Optional when destinationAddress or destinationCenterId is provided',
    example: 23.7925,
  })
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  destinationLatitude?: number;

  @ApiPropertyOptional({
    description:
      'Optional when destinationAddress or destinationCenterId is provided; health center overrides client coords',
    example: 90.4078,
  })
  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  destinationLongitude?: number;

  @ApiPropertyOptional({ enum: AmbulanceVehicleType })
  @IsOptional() @IsEnum(AmbulanceVehicleType)
  vehicleTypeRequired?: AmbulanceVehicleType;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  emergencyType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  patientCondition?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  specialRequirements?: string;

  @ApiPropertyOptional({ description: 'Origin health center ID (guardrail)' })
  @IsOptional() @IsUUID()
  originCenterId?: string;

  @ApiPropertyOptional({ description: 'Destination health center ID (guardrail)' })
  @IsOptional() @IsUUID()
  destinationCenterId?: string;
}

export class CancelBookingDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(500)
  cancelReason: string;
}

// ─── Dispatch DTOs (Dispatcher/Admin) ─────────────────────────────────────

export class ManualDispatchDto {
  @ApiProperty({ description: 'Ambulance ID to assign' })
  @IsUUID()
  ambulanceId: string;

  @ApiProperty({ description: 'Driver profile ID to assign' })
  @IsUUID()
  driverId: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Priority (higher = more urgent)' })
  @IsOptional() @IsNumber() @Min(0) @Max(10)
  @Type(() => Number)
  priority?: number;
}

// ─── Location DTOs (Driver) ────────────────────────────────────────────────

export class PushLocationDto {
  @ApiProperty()
  @IsLatitude()
  @Type(() => Number)
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  accuracy?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  address?: string;

  @ApiProperty({ description: 'Client-side ISO-8601 timestamp' })
  @IsDateString()
  recordedAt: string;
}

// ─── List Query DTOs ───────────────────────────────────────────────────────

export class BookingListQueryDto {
  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  skip?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  take?: number;
}

export class FleetQueryDto {
  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  healthCenterId?: string;

  @ApiPropertyOptional({ enum: AmbulanceStatus })
  @IsOptional() @IsEnum(AmbulanceStatus)
  status?: AmbulanceStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  @Type(() => Boolean)
  onlyWithActiveShift?: boolean;
}
