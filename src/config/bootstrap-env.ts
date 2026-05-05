import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * Load `.env` before Nest bootstraps so providers (e.g. PrismaService) see `process.env`.
 * Must be imported as the first side-effect in `main.ts` (imports run in order).
 */
const envFiles = ['.env.local', '.env'];
for (const file of envFiles) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) {
    config({ path, override: false });
  }
}
