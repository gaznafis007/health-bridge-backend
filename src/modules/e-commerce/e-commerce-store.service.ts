import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisKeyService } from '../../common/redis/redis-key.service';
import { safeRedisClose } from '../../common/redis/safe-redis-close';
import { CartState } from './types/cart.type';

@Injectable()
export class ECommerceStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(ECommerceStoreService.name);
  private readonly redis: Redis | null;
  private readonly memoryCart = new Map<string, CartState>();
  private readonly memoryIdempotency = new Map<string, string>();

  constructor(private readonly redisKeyService: RedisKeyService) {
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

  async getCart(sessionId: string): Promise<CartState | null> {
    const key = this.redisKeyService.cart(sessionId);
    const raw = await this.getValue(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CartState;
  }

  async setCart(
    sessionId: string,
    cart: CartState,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.redisKeyService.cart(sessionId);
    const serialized = JSON.stringify(cart);
    await this.setValue(key, serialized, ttlSeconds);
    this.memoryCart.set(key, cart);
  }

  async deleteCart(sessionId: string): Promise<void> {
    const key = this.redisKeyService.cart(sessionId);
    await this.deleteValue(key);
    this.memoryCart.delete(key);
  }

  async getIdempotency<T>(scope: string, idempotencyKey: string): Promise<T | null> {
    const key = this.redisKeyService.idempotency(scope, idempotencyKey);
    const raw = await this.getValue(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  }

  async setIdempotency(
    scope: string,
    idempotencyKey: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.redisKeyService.idempotency(scope, idempotencyKey);
    const serialized = JSON.stringify(value);
    await this.setValue(key, serialized, ttlSeconds);
    this.memoryIdempotency.set(key, serialized);
  }

  private async getValue(key: string): Promise<string | null> {
    if (this.redis) {
      try {
        return await this.redis.get(key);
      } catch (error) {
        this.logger.warn(
          `Redis read failed for ${key}, falling back to memory store`,
        );
      }
    }

    const idempotencyValue = this.memoryIdempotency.get(key);
    if (idempotencyValue) {
      return idempotencyValue;
    }

    const cart = this.memoryCart.get(key);
    return cart ? JSON.stringify(cart) : null;
  }

  private async setValue(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (error) {
        this.logger.warn(
          `Redis write failed for ${key}, falling back to memory store`,
        );
      }
    }
  }

  private async deleteValue(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (error) {
        this.logger.warn(
          `Redis delete failed for ${key}, falling back to memory store`,
        );
      }
    }
  }
}
