import { ApiProperty } from '@nestjs/swagger';

export class GuestSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty({ example: '2026-05-15T10:00:00.000Z' })
  expiresAt!: string;
}
