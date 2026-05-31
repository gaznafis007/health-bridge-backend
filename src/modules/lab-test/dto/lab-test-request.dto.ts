import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportStatus, TestBookingStatus } from '@prisma/client';

// ─── Catalog DTOs ────────────────────────────────────────────────────────────

export class CreateDiagnosticCenterDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() address: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() state: string;
  @ApiProperty() @IsString() zipCode: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsNumber() lat: number;
  @ApiProperty() @IsNumber() lng: number;
  @ApiPropertyOptional() @IsOptional() @IsString() operatingHours?: string;
}

export class CreateLabTestDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() price: number;
  @ApiProperty() @IsInt() @Min(1) turnaroundDays: number;
  @ApiProperty() @IsString() sampleType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiProperty() @IsBoolean() requiresFasting: boolean;
}

export class UpdateLabTestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) turnaroundDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() sampleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresFasting?: boolean;
}

export class CreateTestPackageDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() originalPrice: number;
  @ApiProperty() @IsNumber() discountedPrice: number;
  @ApiProperty() @IsInt() @Min(1) validityDays: number;
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) testIds: string[];
}

export class UpdateTestPackageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() originalPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountedPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) validityDays?: number;
}

// ─── Booking DTOs ─────────────────────────────────────────────────────────────

export class BookingItemDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() testId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() packageId?: string;
}

export class CreateBookingDto {
  @ApiProperty() @IsUUID() diagnosticCenterId: string;

  @ApiProperty({ type: [BookingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  items: BookingItemDto[];

  @ApiProperty({ example: '2026-06-01' }) @IsDateString() sampleCollectionDate: string;
  @ApiProperty({ example: '09:00' }) @IsString() sampleCollectionTime: string;
  @ApiProperty({ example: 'CASH' }) @IsString() paymentMethod: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CancelBookingDto {
  @ApiProperty() @IsString() cancellationReason: string;
}

export class ConfirmPaymentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() transactionId?: string;
}

// ─── Query DTOs ───────────────────────────────────────────────────────────────

export class TestSearchQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() centerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) skip?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) take?: number;
}

export class BookingListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) skip?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) take?: number;
}

export class AdminReportListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() diagnosticCenterId?: string;

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  reportStatus?: ReportStatus;

  @ApiPropertyOptional({ enum: TestBookingStatus })
  @IsOptional()
  @IsEnum(TestBookingStatus)
  bookingStatus?: TestBookingStatus;

  @ApiPropertyOptional() @IsOptional() @IsDateString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) skip?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) take?: number;
}
