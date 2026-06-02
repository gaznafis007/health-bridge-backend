import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function decimal(value: number | string): string {
  return String(value);
}
