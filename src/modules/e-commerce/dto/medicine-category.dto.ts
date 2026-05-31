import { ApiProperty } from '@nestjs/swagger';

export class MedicineCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: 8 })
  medicineCount!: number;
}
