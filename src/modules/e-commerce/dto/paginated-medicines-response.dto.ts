import { ApiProperty } from '@nestjs/swagger';
import { MedicineSummaryDto } from './medicine-summary.dto';

export class PaginatedMedicinesResponseDto {
  @ApiProperty({ type: [MedicineSummaryDto] })
  items!: MedicineSummaryDto[];

  @ApiProperty({ example: 48 })
  total!: number;

  @ApiProperty({ example: 0 })
  skip!: number;

  @ApiProperty({ example: 20 })
  take!: number;
}
