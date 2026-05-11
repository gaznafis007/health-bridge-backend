import { ApiProperty } from '@nestjs/swagger';

export class MedicineSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  genericName!: string | null;

  @ApiProperty({ nullable: true })
  manufacturer!: string | null;

  @ApiProperty({ example: '12.50' })
  price!: string;

  @ApiProperty({ example: 18 })
  stockQuantity!: number;

  @ApiProperty()
  requiresPrescription!: boolean;

  @ApiProperty()
  status!: string;
}
