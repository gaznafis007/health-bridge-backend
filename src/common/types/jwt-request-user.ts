import type { UserRole } from '@prisma/client';

export type JwtRequestUser = {
  id: string;
  role: UserRole;
  email: string;
};
