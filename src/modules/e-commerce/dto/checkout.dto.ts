import { ApiProperty } from '@nestjs/swagger';
import { OrderPaymentMethod } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { z } from 'zod';

export class CheckoutDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  guestSessionId!: string;

  @ApiProperty({ enum: OrderPaymentMethod })
  @IsEnum(OrderPaymentMethod)
  paymentMethod!: OrderPaymentMethod;

  @ApiProperty({ example: 'House 12, Road 3, Dhanmondi, Dhaka' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  deliveryAddress!: string;

  @ApiProperty({ example: '+8801700000000' })
  @Matches(/^\+?[1-9]\d{7,14}$/)
  deliveryPhone!: string;

  @ApiProperty({ example: 'checkout-guest-2026-0001' })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}

export const checkoutSchema = z.object({
  guestSessionId: z.string().uuid(),
  paymentMethod: z.nativeEnum(OrderPaymentMethod),
  deliveryAddress: z.string().trim().min(5).max(300),
  deliveryPhone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  idempotencyKey: z.string().trim().min(8).max(120),
});
