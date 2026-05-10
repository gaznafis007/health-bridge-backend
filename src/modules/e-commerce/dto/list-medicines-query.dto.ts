import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { z } from 'zod';

export class ListMedicinesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'napa' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  requiresPrescription?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )
  @IsBoolean()
  inStockOnly?: boolean;
}

export const listMedicinesQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  requiresPrescription: z.boolean().optional(),
  inStockOnly: z.boolean().optional(),
});
