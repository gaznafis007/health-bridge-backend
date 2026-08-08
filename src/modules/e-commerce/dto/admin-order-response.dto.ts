import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class AdminOrderResponseDto extends OrderResponseDto {
  @ApiPropertyOptional({
    example: 'patient1@healthbridge.dev',
    nullable: true,
    description: 'Patient account email when the order is linked to a user',
  })
  customerEmail!: string | null;
}

export class AdminPaginatedOrdersResponseDto {
  @ApiProperty({ type: [AdminOrderResponseDto] })
  items!: AdminOrderResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 0 })
  skip!: number;

  @ApiProperty({ example: 20 })
  take!: number;
}
