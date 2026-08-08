import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { RedisKeyService } from '../../common/redis/redis-key.service';
import type { GeocodingProvider } from './providers/geocoding-provider.interface';

function makeProvider(): jest.Mocked<GeocodingProvider> {
  return {
    search: jest.fn(),
    reverse: jest.fn(),
    geocode: jest.fn(),
  };
}

function makeRedisKey(): jest.Mocked<RedisKeyService> {
  return {
    geocodingSearch: jest.fn().mockReturnValue('geo:search:key'),
    geocodingReverse: jest.fn().mockReturnValue('geo:reverse:key'),
    geocodingAddress: jest.fn().mockReturnValue('geo:address:key'),
    rateLimit: jest.fn().mockReturnValue('rate:key'),
  } as unknown as jest.Mocked<RedisKeyService>;
}

describe('GeocodingService', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it('returns cached search results without calling provider', async () => {
    const provider = makeProvider();
    const redisKey = makeRedisKey();
    const svc = new GeocodingService(provider, redisKey);

    const cached = [{ label: 'Cached', lat: 23.7, lng: 90.3 }];
    (svc as unknown as { cacheGet: (key: string) => Promise<unknown> }).cacheGet =
      jest.fn().mockResolvedValue(cached);

    const results = await svc.search('Dhanmondi', 5, 'user-1');
    expect(results).toEqual(cached);
    expect(provider.search).not.toHaveBeenCalled();
  });

  it('maps provider geocode result', async () => {
    const provider = makeProvider();
    provider.geocode.mockResolvedValue({
      label: 'Dhanmondi, Dhaka',
      lat: 23.7461,
      lng: 90.3742,
    });
    const redisKey = makeRedisKey();
    const svc = new GeocodingService(provider, redisKey);

    (svc as unknown as { cacheGet: (key: string) => Promise<unknown> }).cacheGet =
      jest.fn().mockResolvedValue(undefined);
    (svc as unknown as { cacheSet: (key: string, value: unknown) => Promise<void> }).cacheSet =
      jest.fn().mockResolvedValue(undefined);

    const result = await svc.geocode('Dhanmondi, Dhaka');
    expect(result).toEqual({
      label: 'Dhanmondi, Dhaka',
      lat: 23.7461,
      lng: 90.3742,
    });
  });

  it('propagates provider failures from search path', async () => {
    const provider = makeProvider();
    provider.search.mockRejectedValue(
      new ServiceUnavailableException('Geocoding request timed out'),
    );
    const redisKey = makeRedisKey();
    const svc = new GeocodingService(provider, redisKey);

    (svc as unknown as { cacheGet: (key: string) => Promise<unknown> }).cacheGet =
      jest.fn().mockResolvedValue(undefined);

    await expect(svc.search('Dhaka', 5, 'user-1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws when rate limit exceeded', async () => {
    const provider = makeProvider();
    const redisKey = makeRedisKey();
    const svc = new GeocodingService(provider, redisKey);

    const mockRedis = {
      incr: jest.fn().mockResolvedValue(31),
      expire: jest.fn().mockResolvedValue(1),
      quit: jest.fn(),
    };
    (svc as unknown as { redis: typeof mockRedis }).redis = mockRedis;

    await expect(svc.search('Dhaka', 5, 'user-1')).rejects.toThrow(HttpException);
  });
});
