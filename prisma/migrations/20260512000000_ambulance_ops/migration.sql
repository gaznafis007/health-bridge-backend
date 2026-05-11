-- AlterEnum: Add DISPATCHER and DRIVER to UserRole
ALTER TYPE "UserRole" ADD VALUE 'DISPATCHER';
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';

-- CreateEnum: DriverStatus
CREATE TYPE "DriverStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterTable ambulances: make legacy driver fields nullable, add version column
ALTER TABLE "ambulances"
  ALTER COLUMN "driverName" DROP NOT NULL,
  ALTER COLUMN "driverPhone" DROP NOT NULL,
  ALTER COLUMN "driverLicense" DROP NOT NULL;

ALTER TABLE "ambulances"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable ambulance_bookings: make ambulanceId nullable, add new tracking fields
ALTER TABLE "ambulance_bookings"
  ALTER COLUMN "ambulanceId" DROP NOT NULL;

ALTER TABLE "ambulance_bookings"
  ADD COLUMN "driverId"             UUID,
  ADD COLUMN "dispatchedBy"         UUID,
  ADD COLUMN "vehicleTypeRequired"  "AmbulanceVehicleType",
  ADD COLUMN "cancelReason"         TEXT,
  ADD COLUMN "cancelledAt"          TIMESTAMP(3),
  ADD COLUMN "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable driver_profiles
CREATE TABLE "driver_profiles" (
    "id"                UUID         NOT NULL,
    "userId"            UUID         NOT NULL,
    "healthCenterId"    UUID         NOT NULL,
    "licenseNumber"     TEXT         NOT NULL,
    "licenseExpiryDate" TIMESTAMP(3) NOT NULL,
    "isVerified"        BOOLEAN      NOT NULL DEFAULT false,
    "verifiedAt"        TIMESTAMP(3),
    "status"            "DriverStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable ambulance_shifts
CREATE TABLE "ambulance_shifts" (
    "id"             UUID         NOT NULL,
    "driverId"       UUID         NOT NULL,
    "ambulanceId"    UUID         NOT NULL,
    "healthCenterId" UUID         NOT NULL,
    "shiftStart"     TIMESTAMP(3) NOT NULL,
    "shiftEnd"       TIMESTAMP(3),
    "isActive"       BOOLEAN      NOT NULL DEFAULT true,
    "endedAt"        TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambulance_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable dispatch_assignments
CREATE TABLE "dispatch_assignments" (
    "id"           UUID         NOT NULL,
    "bookingId"    UUID         NOT NULL,
    "dispatcherId" UUID         NOT NULL,
    "ambulanceId"  UUID         NOT NULL,
    "driverId"     UUID         NOT NULL,
    "assignedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes"        TEXT,
    "priority"     INTEGER      NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: driver_profiles
CREATE UNIQUE INDEX "driver_profiles_userId_key"        ON "driver_profiles"("userId");
CREATE UNIQUE INDEX "driver_profiles_licenseNumber_key" ON "driver_profiles"("licenseNumber");
CREATE INDEX        "driver_profiles_status_idx"        ON "driver_profiles"("status");
CREATE INDEX        "driver_profiles_healthCenterId_status_idx" ON "driver_profiles"("healthCenterId", "status");

-- CreateIndex: ambulance_shifts
CREATE INDEX "ambulance_shifts_driverId_isActive_idx"      ON "ambulance_shifts"("driverId",    "isActive");
CREATE INDEX "ambulance_shifts_ambulanceId_isActive_idx"   ON "ambulance_shifts"("ambulanceId", "isActive");
CREATE INDEX "ambulance_shifts_healthCenterId_isActive_idx" ON "ambulance_shifts"("healthCenterId", "isActive");

-- CreateIndex: dispatch_assignments
CREATE UNIQUE INDEX "dispatch_assignments_bookingId_key" ON "dispatch_assignments"("bookingId");
CREATE INDEX "dispatch_assignments_dispatcherId_idx"     ON "dispatch_assignments"("dispatcherId");
CREATE INDEX "dispatch_assignments_ambulanceId_idx"      ON "dispatch_assignments"("ambulanceId");
CREATE INDEX "dispatch_assignments_driverId_idx"         ON "dispatch_assignments"("driverId");

-- CreateIndex: ambulances new composite
CREATE INDEX "ambulances_healthCenterId_status_idx" ON "ambulances"("healthCenterId", "status");

-- CreateIndex: ambulance_bookings new composites
CREATE INDEX "ambulance_bookings_ambulanceId_status_idx" ON "ambulance_bookings"("ambulanceId", "status");
CREATE INDEX "ambulance_bookings_driverId_status_idx"    ON "ambulance_bookings"("driverId",    "status");

-- AddForeignKey: driver_profiles
ALTER TABLE "driver_profiles"
  ADD CONSTRAINT "driver_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "driver_profiles"
  ADD CONSTRAINT "driver_profiles_healthCenterId_fkey"
    FOREIGN KEY ("healthCenterId") REFERENCES "health_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ambulance_shifts
ALTER TABLE "ambulance_shifts"
  ADD CONSTRAINT "ambulance_shifts_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ambulance_shifts"
  ADD CONSTRAINT "ambulance_shifts_ambulanceId_fkey"
    FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ambulance_shifts"
  ADD CONSTRAINT "ambulance_shifts_healthCenterId_fkey"
    FOREIGN KEY ("healthCenterId") REFERENCES "health_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ambulance_bookings new columns
ALTER TABLE "ambulance_bookings"
  ADD CONSTRAINT "ambulance_bookings_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: dispatch_assignments
ALTER TABLE "dispatch_assignments"
  ADD CONSTRAINT "dispatch_assignments_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "ambulance_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dispatch_assignments"
  ADD CONSTRAINT "dispatch_assignments_dispatcherId_fkey"
    FOREIGN KEY ("dispatcherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dispatch_assignments"
  ADD CONSTRAINT "dispatch_assignments_ambulanceId_fkey"
    FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dispatch_assignments"
  ADD CONSTRAINT "dispatch_assignments_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
