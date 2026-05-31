import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  medicineId!: string;

  @ApiProperty()
  medicineName!: string;

  @ApiProperty({ nullable: true })
  genericName!: string | null;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: '12.50' })
  unitPrice!: string;

  @ApiProperty({ example: '25.00' })
  totalPrice!: string;

  @ApiProperty()
  requiresPrescription!: boolean;
}

export class CartResponseDto {
  @ApiProperty({ format: 'uuid' })
  guestSessionId!: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items!: CartItemResponseDto[];

  @ApiProperty({ example: 3 })
  totalItems!: number;

  @ApiProperty({ example: '37.50' })
  subtotal!: string;

  @ApiProperty({ example: '2026-05-15T10:00:00.000Z' })
  expiresAt!: string;
}
