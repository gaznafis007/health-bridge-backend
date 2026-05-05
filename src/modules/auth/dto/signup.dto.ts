import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class SignupDto {
  @ApiProperty({ example: 'nafisa@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+8801700000000' })
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone!: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ enum: [UserRole.PATIENT, UserRole.DOCTOR] })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ example: 'Nafisa' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Rahman' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ required: false, example: 'Cardiology' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ required: false, example: 'MBBS, FCPS' })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiProperty({ required: false, example: 'DMC-12345' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;
}
