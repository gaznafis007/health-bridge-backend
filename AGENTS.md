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
- API docs/testing: Swagger (`@nestjs/swagger`) with JSON docs and route examples
- Queue/Jobs: Bull/BullMQ (recommended for notifications/reminders)
- Storage: S3-compatible object storage for reports/files
- Auth: JWT + refresh token rotation
- Observability: structured logging + request id + error tracking (Sentry/OpenTelemetry recommended)

## Architecture Standards
- Keep feature-first modules in `src/modules/*`
- Keep cross-cutting concerns in `src/common/*`
- Keep app configuration in `src/config/*`
- Keep database wiring and Prisma adapters in `src/database/*`
- Keep generated/shared types in `generated/*` or another dedicated shared folder

Recommended structure:
```txt
src/
  common/
    constants/
    decorators/
    filters/
    guards/
    interceptors/
    swagger/
    pipes/
    redis/
    types/
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
generated/
  prisma/
    internal/
    models/
prisma/
  schema/
    *.prisma
```

## NestJS Layering (Industry Standard)
For each module, maintain:
- `*.module.ts` for composition and dependency wiring
- `*.controller.ts` for HTTP transport only
- `*.service.ts` for business logic
- `*.repository.ts` (optional) for complex Prisma queries
- `dto/` for request/response contracts
- `types/` for domain types and mapped result types
- `decorators/` for custom parameter/role decorators
- `constants/` for module-local constants and enums when needed
- `repositories/` only when a feature has multiple Prisma query paths that need isolation
- Swagger decorators on every public controller route: `@ApiTags`, `@ApiOperation`, `@ApiOkResponse`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, and request body/query param decorators when applicable
- Swagger docs must be bootstrapped in `src/main.ts` and exposed at `/docs` with `/docs-json` available for smoke tests
- Reuse a shared Swagger bootstrap helper from `src/common/swagger/*` so e2e tests and production bootstrap stay in sync

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
- Every new or changed API route must update Swagger metadata and include an e2e check for the documented route or docs JSON

## Definition of Done
- API contracts documented
- Validation + auth + rate limit in place
- DB migration and indexes added
- Unit tests pass
- e2e critical path passes
- Logs and errors observable
