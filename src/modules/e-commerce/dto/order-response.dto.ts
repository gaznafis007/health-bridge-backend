import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  medicineId!: string;

  @ApiProperty()
  medicineName!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: '12.50' })
  unitPrice!: string;

  @ApiProperty({ example: '25.00' })
  totalPrice!: string;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  userId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  guestSessionId!: string | null;

  @ApiProperty({ example: '37.50' })
  totalAmount!: string;

  @ApiProperty({ example: '0.00' })
  discountAmount!: string;

  @ApiProperty({ example: '0.00' })
  taxAmount!: string;

  @ApiProperty({ example: '37.50' })
  finalAmount!: string;

  @ApiProperty()
  paymentMethod!: string;

  @ApiProperty()
  paymentStatus!: string;

  @ApiProperty()
  deliveryStatus!: string;

  @ApiProperty()
  deliveryAddress!: string;

  @ApiProperty()
  deliveryPhone!: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty()
  createdAt!: string;
}
