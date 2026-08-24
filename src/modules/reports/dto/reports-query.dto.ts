import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import type { ReportGranularity } from '../constants/reports.constants';

export class DateRangeQueryDto {
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsISO8601()
  from!: string;

  @ApiProperty({ example: '2026-01-31T23:59:59.999Z' })
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional({ enum: ['json', 'csv'], default: 'json' })
  @IsOptional()
  @IsEnum(['json', 'csv'])
  format?: 'json' | 'csv';
}

export class RevenueQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'day' })
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  granularity?: ReportGranularity;
}

export class PaginatedReportQueryDto extends DateRangeQueryDto {
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
