import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

const ADMIN_ASSIGNABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.DISPATCHER,
  UserRole.DRIVER,
  UserRole.PATIENT,
  UserRole.DOCTOR,
] as const;

export class AssignRoleDto {
  @ApiProperty({ enum: ADMIN_ASSIGNABLE_ROLES })
  @IsEnum(ADMIN_ASSIGNABLE_ROLES)
  role!: UserRole;
}
