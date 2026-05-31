# Redis Key Contract

This document defines the canonical Redis key patterns for Health Bridge.

## Global Prefix

All keys must start with:

`{app}:{env}:{version}`

Defaults used by `RedisKeyService`:
- `app`: `hb`
- `env`: `NODE_ENV` or `dev`
- `version`: `v1`

Example full key:
- `hb:prod:v1:cart:guest_abc123`

Configure via env:
- `REDIS_KEY_APP`
- `REDIS_KEY_ENV`
- `REDIS_KEY_VERSION`

## Key Patterns

| Pattern | TTL | Purpose |
| --- | --- | --- |
| `cart:{guest_session_id}` | 7 days | Guest cart items |
| `ambulance:loc:{ambulance_id}` | 60s | Real-time ambulance position (latest heartbeat) |
| `ambulance:booking:{booking_id}:loc` | 60s | Latest location snapshot scoped to a booking |
| `ambulance:active_bookings` | managed | Set of active booking IDs for dispatcher queues |
| `rate:ip:{ip}:{endpoint}` | 1 min | IP-based rate limiting |
| `rate:user:{user_id}:{endpoint}` | 1 min | User-based rate limiting |
| `otp:{phone_hash}` | 5 min | OTP verification state |
| `otp_attempts:{phone_hash}` | 5-15 min | OTP brute-force protection |
| `session:{session_id}` | 24h | Auth session payload |
| `session_index:{user_id}` | 24h | Set of active session ids per user |
| `idempotency:{scope}:{idempotency_key}` | 24h | Prevent duplicate order/payment execution |
| `queue:notifications` | managed by queue | Logical notifications queue key |
| `bull` | managed by Bull/BullMQ | Queue infra prefix |

## Security Notes

- Never store raw OTP in plain text.
- Avoid PII in keys. Phone-based keys must use a hash.
- Prefer payload encryption or signed tokens for sensitive session data.

## Recommended Value Shapes

- `cart:{guest_session_id}`
  - Type: JSON string
  - Example fields: `items`, `currency`, `updatedAt`

- `ambulance:loc:{ambulance_id}`
  - Type: JSON string
  - Example fields: `lat`, `lng`, `accuracy`, `recordedAt`

- `rate:*`
  - Type: integer counter

- `session:{session_id}`
  - Type: JSON string
  - Example fields: `userId`, `role`, `issuedAt`, `expiresAt`

## NestJS Usage

Use `RedisKeyService` from:
- `src/common/redis/redis-key.service.ts`

Example:

```ts
const key = this.redisKeyService.cart(guestSessionId);
await redis.set(key, JSON.stringify(cart), 'EX', 60 * 60 * 24 * 7);
```

## TTL Helper Constants (Suggested)

- cart: `604800`
- ambulance location: `60`
- ambulance booking location: `60`
- rate limit: `60`
- otp: `300`
- otp attempts: `900`
- session: `86400`
- idempotency: `86400`
