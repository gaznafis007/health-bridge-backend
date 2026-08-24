import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TelehealthPresence } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTelehealthRequestDto {
  @ApiPropertyOptional({ example: 'chest pain' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonForVisit?: string;

  @ApiPropertyOptional({ example: 'cardiac' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: 0, description: 'Higher = more urgent in waiting queue' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  queuePriority?: number;
}

export class SetPresenceDto {
  @ApiProperty({ enum: TelehealthPresence, example: TelehealthPresence.ONLINE })
  @IsEnum(TelehealthPresence)
  presence!: TelehealthPresence;
}

export class CancelTelehealthDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdminTelehealthQueryDto {
  @ApiPropertyOptional({ enum: ['REQUESTED', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'MISSED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

export class PatientTelehealthQueryDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
