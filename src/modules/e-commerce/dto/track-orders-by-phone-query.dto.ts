import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { z } from 'zod';

export class TrackOrdersByPhoneQueryDto {
  @ApiProperty({ example: '+8801700000000' })
  @Matches(/^\+?[1-9]\d{7,14}$/)
  deliveryPhone!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

export const trackOrdersByPhoneQuerySchema = z.object({
  deliveryPhone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/),
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(20),
});
