import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { RedisKeyService } from '../../common/redis/redis-key.service';
import { safeRedisClose } from '../../common/redis/safe-redis-close';
import {
  GEOCODING_CACHE_TTL_S,
  GEOCODING_GEOCODE_RATE_LIMIT,
  GEOCODING_PROVIDER,
  GEOCODING_REVERSE_RATE_LIMIT,
  GEOCODING_SEARCH_RATE_LIMIT,
} from './constants/geocoding.constants';
import type { GeocodingProvider } from './providers/geocoding-provider.interface';
import type { GeocodingResult } from './types/geocoding.types';

@Injectable()
export class GeocodingService implements OnModuleDestroy {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly redis: Redis | null;

  constructor(
    @Inject(GEOCODING_PROVIDER)
    private readonly provider: GeocodingProvider,
    private readonly redisKey: RedisKeyService,
  ) {
    const redisUrl = process.env.REDIS_URL;
    this.redis = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        })
      : null;
  }

  async onModuleDestroy(): Promise<void> {
    await safeRedisClose(this.redis);
  }

  async search(
    query: string,
    limit: number,
    userId: string,
  ): Promise<GeocodingResult[]> {
    await this.assertRateLimit('geocoding_search', userId, GEOCODING_SEARCH_RATE_LIMIT);

    const normalized = this.normalizeQuery(query);
    const cacheKey = this.redisKey.geocodingSearch(
      this.hash(`${normalized}:${limit}`),
    );
    const cached = await this.cacheGet<GeocodingResult[]>(cacheKey);
    if (cached) return cached;

    this.logger.log(`Geocoding search cache miss key=${this.hash(normalized)}`);
    const results = await this.provider.search(normalized, limit);
    await this.cacheSet(cacheKey, results);
    return results;
  }

  async reverse(
    lat: number,
    lng: number,
    userId: string,
  ): Promise<GeocodingResult | null> {
    await this.assertRateLimit('geocoding_reverse', userId, GEOCODING_REVERSE_RATE_LIMIT);

    const roundedLat = this.roundCoord(lat);
    const roundedLng = this.roundCoord(lng);
    const cacheKey = this.redisKey.geocodingReverse(
      this.hash(`${roundedLat}:${roundedLng}`),
    );
    const cached = await this.cacheGet<GeocodingResult | null>(cacheKey);
    if (cached !== undefined) return cached;

    this.logger.log(
      `Geocoding reverse cache miss key=${this.hash(`${roundedLat}:${roundedLng}`)}`,
    );
    const result = await this.provider.reverse(lat, lng);
    await this.cacheSet(cacheKey, result);
    return result;
  }

  async geocode(address: string, userId?: string): Promise<GeocodingResult | null> {
    if (userId) {
      await this.assertRateLimit('geocoding_geocode', userId, GEOCODING_GEOCODE_RATE_LIMIT);
    }

    const normalized = this.normalizeQuery(address);
    const cacheKey = this.redisKey.geocodingAddress(this.hash(normalized));
    const cached = await this.cacheGet<GeocodingResult | null>(cacheKey);
    if (cached !== undefined) return cached;

    this.logger.log(`Geocoding address cache miss key=${this.hash(normalized)}`);
    const result = await this.provider.geocode(normalized);
    await this.cacheSet(cacheKey, result);
    return result;
  }

  private normalizeQuery(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private roundCoord(value: number): number {
    return Math.round(value * 10_000) / 10_000;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 20);
  }

  private async assertRateLimit(
    endpoint: string,
    userId: string,
    limit: number,
  ): Promise<void> {
    if (!this.redis) return;

    const key = this.redisKey.rateLimit(endpoint, { userId });
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, 60);
      }
      if (count > limit) {
        throw new HttpException(
          'Geocoding rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warn(`Rate limit check failed for ${endpoint}: ${String(error)}`);
    }
  }

  private async cacheGet<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.redis?.get(key);
      if (raw === null || raw === undefined) return undefined;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(`Redis GET failed for geocoding key: ${String(error)}`);
      return undefined;
    }
  }

  private async cacheSet(key: string, value: unknown): Promise<void> {
    try {
      await this.redis?.setex(key, GEOCODING_CACHE_TTL_S, JSON.stringify(value));
    } catch (error) {
      this.logger.warn(`Redis SET failed for geocoding key: ${String(error)}`);
    }
  }
}
