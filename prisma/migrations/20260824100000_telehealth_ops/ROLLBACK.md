# Rollback: telehealth_ops

Run in reverse order if rolling back this migration.

```sql
-- telehealth_appointments indexes
DROP INDEX IF EXISTS "telehealth_appointments_status_queuePriority_requestedAt_idx";
DROP INDEX IF EXISTS "telehealth_appointments_status_offerExpiresAt_idx";
DROP INDEX IF EXISTS "telehealth_appointments_doctorId_status_idx";

-- telehealth_appointments columns
ALTER TABLE "telehealth_appointments"
  DROP COLUMN IF EXISTS "version",
  DROP COLUMN IF EXISTS "attemptedDoctorIds",
  DROP COLUMN IF EXISTS "offerAttempts",
  DROP COLUMN IF EXISTS "searchExpiresAt",
  DROP COLUMN IF EXISTS "offerExpiresAt";

-- Restore doctorId NOT NULL (only safe if no NULL doctorId rows exist)
-- UPDATE telehealth_appointments SET "doctorId" = '<placeholder>' WHERE "doctorId" IS NULL;
-- ALTER TABLE "telehealth_appointments" ALTER COLUMN "doctorId" SET NOT NULL;

-- doctor_profiles indexes
DROP INDEX IF EXISTS "doctor_profiles_status_isProvideTeleHealth_telehealthPresence_activeTelehealthId_idx";
DROP INDEX IF EXISTS "doctor_profiles_activeTelehealthId_key";

-- doctor_profiles columns
ALTER TABLE "doctor_profiles"
  DROP COLUMN IF EXISTS "activeTelehealthId",
  DROP COLUMN IF EXISTS "telehealthOnlineUntil",
  DROP COLUMN IF EXISTS "telehealthPresence";

-- Restore original index
CREATE INDEX "doctor_profiles_status_idx" ON "doctor_profiles"("status");

-- enum
DROP TYPE IF EXISTS "TelehealthPresence";
```

All added columns are nullable or have defaults; rollback is non-destructive for existing rows.
