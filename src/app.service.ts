import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from './database/prisma.service';

@Injectable()
export class AppService {
  private redis: Redis | null = null;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.REDIS_URL;
    if (url) {
      this.redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<{
    status: 'ok' | 'degraded';
    database: 'up' | 'down';
    redis: 'up' | 'down' | 'disabled';
    timestamp: string;
  }> {
    let database: 'up' | 'down' = 'down';
    let redis: 'up' | 'down' | 'disabled' = 'disabled';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    if (this.redis) {
      try {
        await this.redis.connect();
        const pong = await this.redis.ping();
        redis = pong === 'PONG' ? 'up' : 'down';
      } catch {
        redis = 'down';
      }
    }

    const status =
      database === 'up' && (redis === 'up' || redis === 'disabled')
        ? 'ok'
        : 'degraded';

    return {
      status,
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  }
}
