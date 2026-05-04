import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

type RateActor = { ip: string } | { userId: string };

@Injectable()
export class RedisKeyService {
  private readonly prefix: string;

  constructor() {
    const app = process.env.REDIS_KEY_APP ?? 'hb';
    const env = process.env.REDIS_KEY_ENV ?? process.env.NODE_ENV ?? 'dev';
    const version = process.env.REDIS_KEY_VERSION ?? 'v1';
    this.prefix = `${app}:${env}:${version}`;
  }

  private key(...parts: Array<string | number>): string {
    return `${this.prefix}:${parts.join(':')}`;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 20);
  }

  cart(guestSessionId: string): string {
    return this.key('cart', guestSessionId);
  }

  ambulanceLocation(ambulanceId: string): string {
    return this.key('ambulance', 'loc', ambulanceId);
  }

  rateLimit(endpoint: string, actor: RateActor): string {
    if ('userId' in actor) {
      return this.key('rate', 'user', actor.userId, endpoint);
    }
    return this.key('rate', 'ip', actor.ip, endpoint);
  }

  otp(phone: string): string {
    return this.key('otp', this.hash(phone));
  }

  otpAttempts(phone: string): string {
    return this.key('otp_attempts', this.hash(phone));
  }

  session(sessionId: string): string {
    return this.key('session', sessionId);
  }

  sessionIndex(userId: string): string {
    return this.key('session_index', userId);
  }

  idempotency(scope: string, idempotencyKey: string): string {
    return this.key('idempotency', scope, idempotencyKey);
  }

  bullPrefix(): string {
    return this.key('bull');
  }

  notificationsQueue(): string {
    return this.key('queue', 'notifications');
  }
}
