import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TelehealthPresence, TelehealthStatus } from '@prisma/client';

export class TelehealthRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  patientId!: string;

  @ApiPropertyOptional({ nullable: true })
  doctorId!: string | null;

  @ApiProperty({ enum: TelehealthStatus })
  status!: TelehealthStatus;

  @ApiProperty()
  consultationFee!: string;

  @ApiProperty()
  waitingForDoctor!: boolean;

  @ApiPropertyOptional({ nullable: true })
  searchExpiresAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  offerExpiresAt!: string | null;

  @ApiProperty()
  requestedAt!: string;
}

export class JoinTelehealthResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty()
  roomId!: string;

  @ApiProperty()
  expiresAt!: string;
}

export class DoctorPresenceResponseDto {
  @ApiProperty({ enum: TelehealthPresence })
  presence!: TelehealthPresence;

  @ApiProperty({ enum: ['ONLINE', 'BUSY', 'IN_CALL', 'OFFLINE'] })
  effectiveAvailability!: string;

  @ApiPropertyOptional({ nullable: true })
  onlineUntil!: string | null;

  @ApiProperty()
  isProvideTeleHealth!: boolean;

  @ApiProperty()
  pendingOffers!: number;
}
