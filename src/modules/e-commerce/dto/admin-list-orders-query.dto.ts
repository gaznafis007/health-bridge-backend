import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { z } from 'zod';

export class AdminListOrdersQueryDto {
  @ApiPropertyOptional({ example: 'patient1@healthbridge.dev' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional({ example: '+8801700' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  phone?: string;

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

export const adminListOrdersQuerySchema = z.object({
  email: z.string().trim().min(3).max(120).optional(),
  phone: z.string().trim().min(3).max(20).optional(),
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(20),
});
