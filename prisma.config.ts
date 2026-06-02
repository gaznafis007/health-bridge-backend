import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: `prisma/schema`,
  migrations: {
    path: `prisma/migrations`,
    seed: 'ts-node -P tsconfig.seed.json prisma/seed.ts',
  },
  datasource: {
    url: process.env[`DATABASE_URL`],
    shadowDatabaseUrl: process.env['DIRECT_URL'], // 👈 use direct here
  },
});
