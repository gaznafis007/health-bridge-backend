/** E2E tests mock Prisma and must not hit external Redis/BullMQ. */
process.env.REDIS_URL = '';
