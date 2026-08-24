-- CreateEnum
CREATE TYPE "TelehealthPresence" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY');

-- AlterTable: doctor_profiles
ALTER TABLE "doctor_profiles"
  ADD COLUMN "telehealthPresence" "TelehealthPresence" NOT NULL DEFAULT 'OFFLINE',
  ADD COLUMN "telehealthOnlineUntil" TIMESTAMP(3),
  ADD COLUMN "activeTelehealthId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_activeTelehealthId_key" ON "doctor_profiles"("activeTelehealthId");

-- CreateIndex
CREATE INDEX "doctor_profiles_status_isProvideTeleHealth_telehealthPresence_activeTelehealthId_idx"
  ON "doctor_profiles"("status", "isProvideTeleHealth", "telehealthPresence", "activeTelehealthId");

-- DropIndex (replaced by composite index)
DROP INDEX IF EXISTS "doctor_profiles_status_idx";

-- AlterTable: telehealth_appointments
ALTER TABLE "telehealth_appointments"
  ALTER COLUMN "doctorId" DROP NOT NULL,
  ADD COLUMN "offerExpiresAt" TIMESTAMP(3),
  ADD COLUMN "searchExpiresAt" TIMESTAMP(3),
  ADD COLUMN "offerAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "attemptedDoctorIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "telehealth_appointments_doctorId_status_idx" ON "telehealth_appointments"("doctorId", "status");

-- CreateIndex
CREATE INDEX "telehealth_appointments_status_offerExpiresAt_idx" ON "telehealth_appointments"("status", "offerExpiresAt");

-- CreateIndex
CREATE INDEX "telehealth_appointments_status_queuePriority_requestedAt_idx"
  ON "telehealth_appointments"("status", "queuePriority", "requestedAt");
