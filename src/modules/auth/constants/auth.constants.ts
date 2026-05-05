import { UserRole } from '@prisma/client';
export const AUTH_ALLOWED_SIGNUP_ROLES: UserRole[] = [
  UserRole.PATIENT,
  UserRole.DOCTOR,
];

export const AUTH_ACCESS_TOKEN_TTL = '15m';
export const AUTH_REFRESH_TOKEN_TTL_DAYS = 7;
