# AGENTS.md

## Mission
Build Health Bridge backend with clean modular architecture, fast iteration, and production-grade reliability.

## Core Product Features
1. Unauthenticated medicine purchase (guest cart, checkout, tracking)
2. Lab testing with sample collection, payment-first, report delivery
3. Emergency ambulance booking with health-center guardrail and live tracking
4. In-person doctor appointments and separate emergency telehealth video service
5. Patient dashboard (appointments, reports, prescriptions, orders, transactions)
6. Doctor dashboard (today schedule, KPIs, availability, telehealth enable/disable)
7. Admin dashboard and business reports
8. Email notification automation

## Required Stack
- Runtime/API: NestJS
- ORM/DB: Prisma + PostgreSQL
- Cache/Realtime: Redis (ioredis, @nestjs-modules/ioredis)
- Validation: Zod + DTO guards/pipes
- Queue/Jobs: Bull/BullMQ (recommended for notifications/reminders)
- Storage: S3-compatible object storage for reports/files
- Auth: JWT + refresh token rotation
- Observability: structured logging + request id + error tracking (Sentry/OpenTelemetry recommended)

## Architecture Standards
- Keep feature-first modules in `src/modules/*`
- Keep cross-cutting concerns in `src/common/*`
- Keep generated/shared types in dedicated folders

Recommended structure:
```txt
src/
  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    redis/
    constants/
    utils/
  config/
  database/
  modules/
    auth/
    users/
    e-commerce/
    lab-test/
    ambulance/
    appointment/
    telehealth/
    payment/
    notification/
    dashboard/
    reports/
```

## NestJS Layering (Industry Standard)
For each module, maintain:
- `*.controller.ts` for HTTP transport only
- `*.service.ts` for business logic
- `*.repository.ts` (optional) for complex Prisma queries
- `dto/` for request/response contracts
- `types/` for domain types and mapped result types
- `decorators/` for custom parameter/role decorators

Controller rules:
- No business logic
- No direct Prisma calls
- Validate input via DTO + Zod/class-validator

Service rules:
- Transaction boundaries live in service
- Idempotency checks and concurrency guards live in service
- Emit domain events/jobs from service

## Prisma Standards
- Keep schema split by feature under `prisma/schema/*.prisma`
- Use enums for all finite states
- Use `Decimal` for money
- Always add indexes for high-frequency filters
- Use soft delete only where required by product/legal needs

## Redis Standards
Use `RedisKeyService` for all keys. Avoid hardcoded strings.
- Prefix: `{app}:{env}:{version}`
- Contract: `docs/redis-key-contract.md`

## Security Standards
- Hash sensitive identifiers in cache keys (phone/email)
- Encrypt tokens/secrets at rest
- Use short TTL for OTP and rate limits
- Validate authorization per resource owner

## Delivery Pace Rules
- Build vertical slices by feature (API + service + schema + tests)
- Ship behind feature flags when risky
- Prefer small PRs with migration + rollback notes
- Every feature must include: happy path test + one failure path test

## Definition of Done
- API contracts documented
- Validation + auth + rate limit in place
- DB migration and indexes added
- Unit tests pass
- e2e critical path passes
- Logs and errors observable
