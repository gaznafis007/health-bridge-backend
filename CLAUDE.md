# CLAUDE.md

## Project Brief
Health Bridge is a healthcare super-app backend with four transactional cores:
- Medicine commerce
- Lab testing
- Ambulance emergency transport
- Appointments + emergency telehealth

This file is the quick implementation playbook for contributors.

## Feature Breakdown
1. Guest medicine order
- Redis cart (`cart:{guest_session_id}`)
- Guest checkout (`orders.userId = null`)
- Cash/online payment
- Delivery tracking

2. Lab test booking
- Auth patient chooses center, tests/packages
- Advance payment required
- Sample lifecycle tracking
- Report generation and anonymous token access
- Ready-report email

3. Emergency ambulance
- User requests emergency ride
- Guardrail: pickup or destination must map to health center
- Nearest available ambulance assignment
- Live location tracking from Redis + logs to DB
- Completion-time payment

4. Appointment and telehealth (strictly separate)
- Appointment: scheduled in-person doctor visit
- Telehealth: emergency, on-demand video call
- Only doctors with `isProvideTeleHealth=true` and `status=ACTIVE` are eligible

## Engineering Conventions
- Language: TypeScript strict mode where possible
- Pattern: Controller -> Service -> Repository (if needed)
- Use decorators/guards for auth and role checks
- Keep DTOs, domain `types`, and enums organized by module

Recommended per-module layout:
```txt
modules/<feature>/
  controllers/
  services/
  repositories/
  dto/
  types/
  decorators/
  <feature>.module.ts
```

## Data and Infra
- DB: PostgreSQL + Prisma (split schema files)
- Cache: Redis (all keys from `RedisKeyService`)
- Queue: Bull/BullMQ for reminders, email, async workflows
- File storage: S3-compatible bucket for reports and attachments

## Industry Standards Checklist
- Keep controller thin; no query/business logic
- Keep services deterministic and testable
- Put shared constants in `src/common/constants`
- Put shared interfaces/types in `src/common/types`
- Validate all inputs at boundary (DTO/Zod)
- Use request-scoped correlation id for logs
- Add migration notes for each schema change

## Quality Gates
- Unit tests for service logic
- e2e tests for critical user flows
- Idempotency for payment/order endpoints
- Rate limit for auth/otp/payment endpoints
- Structured audit logs for payment/refund/status changes

## Immediate Next Build Order
1. Auth + users + roles
2. E-commerce guest cart and checkout
3. Payment integration and idempotency
4. Lab booking/report pipeline
5. Ambulance matching/tracking
6. Appointment + telehealth workflows
7. Dashboards and reporting
8. Notification automation
