-- CreateEnum
CREATE TYPE "TestBookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterTable: test_bookings
ALTER TABLE "test_bookings"
  ADD COLUMN "bookingStatus"       "TestBookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  ADD COLUMN "cancelledAt"         TIMESTAMP(3),
  ADD COLUMN "cancellationReason"  TEXT,
  ADD COLUMN "sampleCollectedAt"   TIMESTAMP(3);

-- AlterTable: test_reports
ALTER TABLE "test_reports"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
