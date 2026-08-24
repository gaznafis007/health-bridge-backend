# Frontend Integration — Telehealth, Reports, Dashboard, Verification

This guide covers the four new vertical slices and how to wire them from a web or mobile client. For the full API catalog see [documentation.md](../documentation.md) and live OpenAPI at `/docs-json`.

---

## 1. Telehealth (emergency on-demand video)

Telehealth is **separate** from in-person appointments. It uses its own routes under `/telehealth/*`, its own status enum, and doctor **presence** (not appointment availability rules).

### State machine (patient)

| Status | UI meaning |
|--------|------------|
| `REQUESTED` + `waitingForDoctor: true` | Finding a doctor — show countdown to `searchExpiresAt` |
| `REQUESTED` + `doctorId` set | Ringing a specific doctor — poll every ~3s |
| `ACCEPTED` / `DOCTOR_JOINED` / `PATIENT_JOINED` | Session forming — patient can join |
| `ACTIVE` | In call |
| `COMPLETED` | Done — show receipt/summary |
| `MISSED` | No doctor within 3 minutes — offer retry |
| `CANCELLED` | Patient or system cancelled |

### Patient flow

```typescript
const API = 'http://localhost:5000';
const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'Idempotency-Key': crypto.randomUUID(), // on POST /telehealth/requests
};

// 1. Request consult
const created = await fetch(`${API}/telehealth/requests`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ reasonForVisit: 'Chest pain', queuePriority: 1 }),
}).then((r) => r.json());

// 2. Poll until accepted or terminal
async function pollRequest(id: string) {
  for (;;) {
    const row = await fetch(`${API}/telehealth/requests/${id}`, { headers }).then((r) => r.json());
    if (['ACCEPTED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED'].includes(row.status)) return row;
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// 3. Join video (token is short-lived — request at join time only)
const join = await fetch(`${API}/telehealth/requests/${created.id}/join`, {
  method: 'POST',
  headers,
}).then((r) => r.json());
// join.token, join.roomId, join.expiresAt — pass to your video SDK wrapper
```

### Doctor flow

```typescript
// Heartbeat every ~30s while "online" for telehealth
await fetch(`${API}/telehealth/doctor/presence`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ presence: 'ONLINE' }), // or BUSY | OFFLINE
});

// Poll inbox ~5s while online
const inbox = await fetch(`${API}/telehealth/doctor/inbox`, { headers }).then((r) => r.json());

// Accept offer
await fetch(`${API}/telehealth/requests/${offerId}/accept`, { method: 'POST', headers });

// Or decline → system rings next doctor
await fetch(`${API}/telehealth/requests/${offerId}/decline`, { method: 'POST', headers });
```

### Presence widget

Response from `GET /telehealth/doctor/presence`:

| Field | Use |
|-------|-----|
| `presence` | Doctor-declared: `ONLINE`, `BUSY`, `OFFLINE` |
| `effectiveAvailability` | UI label: adds `IN_CALL` when system has claimed the doctor |
| `onlineUntil` | Heartbeat expiry — refresh before this time |
| `pendingOffers` | Count of ringing requests |

**Rules:** Only doctors with `isProvideTeleHealth=true`, `ACTIVE` status, `presence=ONLINE`, fresh heartbeat, and no active claim receive offers.

### HTTP status → UI action

| Code | Action |
|------|--------|
| `409` on accept | Offer taken or expired — refresh inbox |
| `403` | Wrong role or not participant |
| `404` | Unknown request id |
| `MISSED` status | Show retry button (3-minute search window elapsed) |

### Video tokens

- Request join token only when entering the call UI.
- Never cache tokens in localStorage.
- Re-mint on reconnect via `POST .../join`.
- List endpoints never include tokens.

---

## 2. Business reports (admin)

All routes require `Authorization: Bearer <admin JWT>`.

| Route | Query params |
|-------|----------------|
| `GET /reports/revenue` | `from`, `to` (ISO), `granularity=day\|week\|month`, optional `format=csv` |
| `GET /reports/operations` | `from`, `to`, optional `format=csv` |
| `GET /reports/doctors` | `from`, `to`, `skip`, `take` (max 100) |
| `GET /reports/top-medicines` | `from`, `to`, `take` |
| `GET /reports/top-tests` | `from`, `to`, `take` |

Range is capped at **366 days**. Amounts in revenue rows are **strings**.

```typescript
const q = new URLSearchParams({
  from: '2026-01-01T00:00:00.000Z',
  to: '2026-01-31T23:59:59.999Z',
  granularity: 'day',
});
const revenue = await fetch(`${API}/reports/revenue?${q}`, { headers: adminHeaders }).then((r) => r.json());
```

---

## 3. Dashboard additions (additive only)

Existing keys are unchanged; new blocks were added.

### Patient `GET /dashboard/patient`

- `recentTransactions[]` — latest payments (`amount` as string)
- `counts` — `{ appointments, labBookings, orders, telehealth }`

### Doctor `GET /dashboard/doctor`

- `availability[]` — in-person rules with `healthCenterName`
- `telehealth` — `{ isProvideTeleHealth, presence, effectiveAvailability, onlineUntil, pendingOffers, completedThisMonth, rating }`
- `counts.next7DaysScheduled`, `counts.completedThisMonth`

### Admin `GET /dashboard/admin`

- `telehealth` — `{ waitingRequests, activeSessions, missedToday }`

### Doctor telehealth opt-in

`PATCH /users/me/doctor-profile` with `{ "isProvideTeleHealth": true }` — only allowed when doctor `status` is `ACTIVE`.

---

## 4. Email & phone verification

No existing route is verification-gated yet. Signup still succeeds without verified email/phone.

| Route | Auth | Body |
|-------|------|------|
| `POST /auth/verify/email/request` | Bearer | — |
| `POST /auth/verify/email/confirm` | Public | `{ "token": "..." }` |
| `POST /auth/verify/phone/request` | Bearer | — |
| `POST /auth/verify/phone/confirm` | Bearer | `{ "code": "123456" }` |

All success responses: `{ "success": true }` (generic — no enumeration).

**Phone OTP:** Requires Redis (`REDIS_URL`). Returns `503` if Redis unavailable. Resend cooldown **60s**, max **5** attempts then **15 min** lockout.

**Email:** Link expires in **30 minutes**. Token uses dedicated `VERIFICATION_TOKEN_SECRET` with `typ: email_verify`.

```typescript
// After login, prompt user to verify
await fetch(`${API}/auth/verify/email/request`, { method: 'POST', headers });
await fetch(`${API}/auth/verify/phone/request`, { method: 'POST', headers });
// User enters OTP
await fetch(`${API}/auth/verify/phone/confirm`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ code: '123456' }),
});
```

Check `GET /users/me` for `emailVerifiedAt`, `phoneVerifiedAt`, `isVerified`.

---

## Environment variables (new)

| Variable | Purpose |
|----------|---------|
| `TELEHEALTH_VIDEO_SECRET` | HMAC signing for mock video join tokens |
| `TELEHEALTH_DEFAULT_FEE` | Default consultation fee (default `500`) |
| `VERIFICATION_TOKEN_SECRET` | Email verification JWT (required in production) |
| `OTP_PEPPER` | HMAC pepper for OTP hashing |
| `REDIS_URL` | Required for phone OTP |

---

## Polling recommendations

| Context | Interval |
|---------|----------|
| Patient request status while `REQUESTED` | 3s, backoff to 5s |
| Doctor inbox while online | 5s |
| Presence heartbeat | 30s (server TTL 60s) |
