import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { GEOCODING_DEFAULT_SEARCH_LIMIT, GEOCODING_MAX_SEARCH_LIMIT } from '../constants/geocoding.constants';

export class GeocodingSearchQueryDto {
  @ApiProperty({ example: 'Dhanmondi, Dhaka' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  q!: string;

  @ApiPropertyOptional({ default: GEOCODING_DEFAULT_SEARCH_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(GEOCODING_MAX_SEARCH_LIMIT)
  limit?: number = GEOCODING_DEFAULT_SEARCH_LIMIT;
}

export class GeocodingReverseQueryDto {
  @ApiProperty({ example: 23.7461 })
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 90.3742 })
  @Type(() => Number)
  @IsLongitude()
  lng!: number;
}
