import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { z } from 'zod';

export class GetOrderQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  guestSessionId!: string;
}

export const getOrderQuerySchema = z.object({
  guestSessionId: z.string().uuid(),
});
