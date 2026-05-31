import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { z } from 'zod';

export class UpsertCartItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  guestSessionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  medicineId!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}

export const upsertCartItemSchema = z.object({
  guestSessionId: z.string().uuid(),
  medicineId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});
