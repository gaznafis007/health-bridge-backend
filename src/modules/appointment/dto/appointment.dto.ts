import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  APPOINTMENT_TIME_HH_MM_REGEX,
  DATE_YMD_REGEX,
} from '../constants/appointment.constants';

export class SearchDoctorsQueryDto {
  @ApiProperty({
    description: `Case-insensitive substring match`,
    example: 'Cardio',
  })
  @IsString()
  @MinLength(1)
  specialization!: string;

  @ApiProperty({
    description: `Calendar day in UTC (YYYY-MM-DD) used for slot counting`,
    example: '2026-05-12',
  })
  @IsString()
  @Matches(DATE_YMD_REGEX, {
    message: 'date must be YYYY-MM-DD',
  })
  date!: string;

  @ApiPropertyOptional({
    description:
      'When set, only doctors with availability at this health centre on `date` appear; `freeSlotCount` counts only slots at this centre.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  healthCenterId?: string;
}

export class DoctorBookingDateQueryDto {
  @ApiProperty({ example: '2026-05-12' })
  @IsString()
  @Matches(DATE_YMD_REGEX)
  date!: string;

  @ApiPropertyOptional({
    description:
      'When set, only centres and slots at this health centre id are returned.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  healthCenterId?: string;
}

export class AppointmentListQueryDto {
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({
    description: `Page size (max 100)`,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

export class DoctorScheduleQueryDto {
  @ApiPropertyOptional({
    description: `Inclusive range start UTC (YYYY-MM-DD). Defaults to today's UTC midnight`,
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_YMD_REGEX)
  from?: string;

  @ApiPropertyOptional({
    description: `Inclusive range end UTC (YYYY-MM-DD). Defaults from + 7 offsets (8 calendar UTC days inclusive of from)`,
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_YMD_REGEX)
  toInclusive?: string;

  @ApiPropertyOptional({
    description: 'When set, only appointments at this health centre are returned.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  healthCenterId?: string;
}

export class CreateAvailabilityDto {
  @ApiProperty({ description: `Registered health centre row` })
  @IsUUID()
  healthCenterId!: string;

  @ApiProperty({ example: '09:00' })
  @Matches(APPOINTMENT_TIME_HH_MM_REGEX)
  startTime!: string;

  @ApiProperty({ example: '12:00' })
  @Matches(APPOINTMENT_TIME_HH_MM_REGEX)
  endTime!: string;

  @ApiProperty({ minimum: 5, maximum: 480, example: 20 })
  @IsInt()
  @Min(5)
  @Max(480)
  slotDurationMinutes!: number;

  @ApiProperty()
  @IsBoolean()
  isRecurring!: boolean;

  @ApiPropertyOptional({ enum: DayOfWeek })
  @ValidateIf((o: CreateAvailabilityDto) => o.isRecurring)
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @ValidateIf((o: CreateAvailabilityDto) => !o.isRecurring)
  @IsDateString()
  specificDate?: string;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  healthCenterId?: string;

  @ApiPropertyOptional({ example: '09:30' })
  @IsOptional()
  @Matches(APPOINTMENT_TIME_HH_MM_REGEX)
  startTime?: string;

  @ApiPropertyOptional({ example: '13:00' })
  @IsOptional()
  @Matches(APPOINTMENT_TIME_HH_MM_REGEX)
  endTime?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 480 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  slotDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: DayOfWeek })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  specificDate?: string | null;
}

export class BookAppointmentDto {
  @ApiProperty({ description: `DoctorAvailability row UUID` })
  @IsUUID()
  availabilityRuleId!: string;

  @ApiProperty({ description: `UTC calendar day`, example: '2026-05-14' })
  @Matches(DATE_YMD_REGEX)
  date!: string;

  @ApiProperty({ example: '10:20' })
  @Matches(APPOINTMENT_TIME_HH_MM_REGEX)
  startTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reasonForVisit?: string;
}
