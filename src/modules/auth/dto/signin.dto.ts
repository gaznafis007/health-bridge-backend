import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SigninDto {
  @ApiProperty({ example: 'nafisa@example.com' })
  @IsString()
  identity!: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  password!: string;
}
