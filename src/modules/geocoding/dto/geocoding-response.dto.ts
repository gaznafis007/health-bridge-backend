import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeocodingResultDto {
  @ApiProperty({ example: 'Dhanmondi, Dhaka, Bangladesh' })
  label!: string;

  @ApiProperty({ example: 23.7461 })
  lat!: number;

  @ApiProperty({ example: 90.3742 })
  lng!: number;
}

export class GeocodingSearchResponseDto {
  @ApiProperty({ type: [GeocodingResultDto] })
  results!: GeocodingResultDto[];
}

export class GeocodingReverseResponseDto {
  @ApiPropertyOptional({ type: GeocodingResultDto, nullable: true })
  result!: GeocodingResultDto | null;
}
