import type Redis from 'ioredis';

/** Gracefully close a lazy-connect Redis client without throwing on teardown. */
export async function safeRedisClose(
  client: Redis | null | undefined,
): Promise<void> {
  if (!client) return;

  try {
    const status = client.status;
    if (status === 'ready' || status === 'connecting') {
      await client.quit();
      return;
    }
    client.disconnect();
  } catch {
    client.disconnect();
  }
}
