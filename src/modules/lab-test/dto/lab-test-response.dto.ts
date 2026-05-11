import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DiagnosticCenterDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() address: string;
  @ApiProperty() city: string;
  @ApiProperty() state: string;
  @ApiProperty() zipCode: string;
  @ApiProperty() phone: string;
  @ApiProperty() email: string;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiPropertyOptional() operatingHours?: string | null;
  @ApiProperty() createdAt: Date;
}

export class LabTestDto {
  @ApiProperty() id: string;
  @ApiProperty() diagnosticCenterId: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() price: string;
  @ApiProperty() turnaroundDays: number;
  @ApiProperty() sampleType: string;
  @ApiPropertyOptional() instructions?: string | null;
  @ApiProperty() requiresFasting: boolean;
  @ApiProperty() status: string;
  @ApiProperty() createdAt: Date;
}

export class TestPackageDto {
  @ApiProperty() id: string;
  @ApiProperty() diagnosticCenterId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() originalPrice: string;
  @ApiProperty() discountedPrice: string;
  @ApiProperty() validityDays: number;
  @ApiProperty() status: string;
  @ApiProperty() createdAt: Date;
}

export class BookingItemResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() testId?: string | null;
  @ApiPropertyOptional() packageId?: string | null;
  @ApiProperty() price: string;
}

export class TestBookingDto {
  @ApiProperty() id: string;
  @ApiProperty() patientId: string;
  @ApiProperty() diagnosticCenterId: string;
  @ApiProperty() bookingDate: Date;
  @ApiProperty() sampleCollectionDate: Date;
  @ApiProperty() sampleCollectionTime: string;
  @ApiProperty() sampleStatus: string;
  @ApiProperty() bookingStatus: string;
  @ApiProperty() totalAmount: string;
  @ApiProperty() paymentStatus: string;
  @ApiPropertyOptional() notes?: string | null;
  @ApiPropertyOptional() cancelledAt?: Date | null;
  @ApiPropertyOptional() cancellationReason?: string | null;
  @ApiPropertyOptional() sampleCollectedAt?: Date | null;
  @ApiPropertyOptional() completedAt?: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: [BookingItemResponseDto] }) items: BookingItemResponseDto[];
}

export class TestReportDto {
  @ApiProperty() id: string;
  @ApiProperty() bookingId: string;
  @ApiPropertyOptional() testId?: string | null;
  @ApiProperty() reportToken: string;
  @ApiProperty() reportUrl: string;
  @ApiProperty() reportFileName: string;
  @ApiProperty() reportStatus: string;
  @ApiPropertyOptional() generatedAt?: Date | null;
  @ApiPropertyOptional() deliveredAt?: Date | null;
  @ApiProperty() createdAt: Date;
}

export class PublicReportDto {
  @ApiProperty() reportUrl: string;
  @ApiProperty() reportFileName: string;
}

export class AdminReportListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() reportFileName: string;
  @ApiProperty() reportToken: string;
  @ApiProperty() reportStatus: string;
  @ApiPropertyOptional() deliveredAt?: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() bookingId: string;
  @ApiProperty() bookingStatus: string;
  @ApiProperty() patientId: string;
  @ApiProperty() patientName: string;
  @ApiProperty() patientEmail: string;
  @ApiProperty() centerName: string;
  @ApiPropertyOptional() testName?: string | null;
}

export class PatientReportListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() reportFileName: string;
  @ApiProperty() reportToken: string;
  @ApiProperty() reportStatus: string;
  @ApiPropertyOptional() deliveredAt?: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() bookingId: string;
  @ApiProperty() centerName: string;
  @ApiPropertyOptional() testName?: string | null;
}

export class PaginatedResponseDto<T> {
  @ApiProperty() total: number;
  @ApiProperty() data: T[];
}
