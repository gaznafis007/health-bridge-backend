-- CreateEnum
CREATE TYPE "HealthCenterType" AS ENUM ('HOSPITAL', 'CLINIC', 'DIAGNOSTIC_CENTER');

-- CreateEnum
CREATE TYPE "AmbulanceStatus" AS ENUM ('AVAILABLE', 'ON_DUTY', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AmbulanceVehicleType" AS ENUM ('BASIC', 'ADVANCED', 'ICU');

-- CreateEnum
CREATE TYPE "AmbulanceBookingStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TelehealthStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DOCTOR_JOINED', 'PATIENT_JOINED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateEnum
CREATE TYPE "TelehealthSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MedicineStatus" AS ENUM ('ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('ONLINE', 'CASH');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('PENDING', 'PENDING_CASH', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockLogAction" AS ENUM ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'EXPIRY');

-- CreateEnum
CREATE TYPE "LabTestStatus" AS ENUM ('ACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('PENDING', 'COLLECTED', 'PROCESSING', 'COMPLETED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "TestPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'READY', 'DELIVERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('APPOINTMENT', 'ORDER', 'REPORT', 'PRESCRIPTION', 'TRANSACTION');

-- CreateEnum
CREATE TYPE "DeliveryStatusLog" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "PaymentEntityType" AS ENUM ('ORDER', 'APPOINTMENT', 'TELEHEALTH_APPOINTMENT', 'TEST_BOOKING', 'AMBULANCE');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('ONLINE', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PENDING_CASH', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('STRIPE', 'BKASH', 'NAGAD', 'MANUAL');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('CUSTOMER_REQUEST', 'CANCELLATION', 'DUPLICATE', 'FAILURE', 'OTHER');

-- CreateEnum
CREATE TYPE "SavedMethodType" AS ENUM ('CARD', 'MOBILE_WALLET', 'BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "DoctorStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "health_centers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "type" "HealthCenterType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulances" (
    "id" UUID NOT NULL,
    "healthCenterId" UUID NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" "AmbulanceVehicleType" NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "driverLicense" TEXT NOT NULL,
    "insuranceNumber" TEXT,
    "status" "AmbulanceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambulances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_bookings" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "ambulanceId" UUID NOT NULL,
    "paymentId" UUID,
    "originCenterId" UUID,
    "destinationCenterId" UUID,
    "pickupAddress" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "destinationLatitude" DOUBLE PRECISION NOT NULL,
    "destinationLongitude" DOUBLE PRECISION NOT NULL,
    "estimatedDistance" DOUBLE PRECISION,
    "estimatedFare" DECIMAL(12,2) NOT NULL,
    "actualFare" DECIMAL(12,2),
    "status" "AmbulanceBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "emergencyType" TEXT,
    "patientCondition" TEXT,
    "specialRequirements" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambulance_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_location_logs" (
    "id" UUID NOT NULL,
    "ambulanceBookingId" UUID NOT NULL,
    "ambulanceId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "address" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambulance_location_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "paymentId" UUID,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "appointmentTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reasonForVisit" TEXT,
    "notes" TEXT,
    "consultationFee" DECIMAL(12,2) NOT NULL,
    "isFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "previousAppointmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telehealth_appointments" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "paymentId" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "status" "TelehealthStatus" NOT NULL DEFAULT 'REQUESTED',
    "queuePriority" INTEGER NOT NULL DEFAULT 0,
    "emergencyType" TEXT,
    "reasonForVisit" TEXT,
    "notes" TEXT,
    "consultationFee" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "telehealth_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telehealth_sessions" (
    "id" UUID NOT NULL,
    "telehealthId" UUID NOT NULL,
    "videoRoomId" TEXT NOT NULL,
    "videoRoomToken" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "recordingUrl" TEXT,
    "status" "TelehealthSessionStatus" NOT NULL DEFAULT 'PENDING',
    "recordingSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telehealth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_notes" (
    "id" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "mongoDocId" TEXT,
    "diagnosis" TEXT,
    "treatmentPlan" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "prescriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "medicines" JSONB NOT NULL,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "manufacturer" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "composition" TEXT,
    "sideEffects" TEXT,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "expiryDate" TIMESTAMP(3),
    "batchNumber" TEXT,
    "status" "MedicineStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "guestSessionId" TEXT,
    "paymentId" UUID,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "OrderPaymentMethod" NOT NULL,
    "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryAddress" TEXT NOT NULL,
    "deliveryPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_logs" (
    "id" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "action" "StockLogAction" NOT NULL,
    "quantityChanged" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_sessions" (
    "id" UUID NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_centers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "operatingHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_tests" (
    "id" UUID NOT NULL,
    "diagnosticCenterId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "turnaroundDays" INTEGER NOT NULL,
    "sampleType" TEXT NOT NULL,
    "instructions" TEXT,
    "requiresFasting" BOOLEAN NOT NULL DEFAULT false,
    "status" "LabTestStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_packages" (
    "id" UUID NOT NULL,
    "diagnosticCenterId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "originalPrice" DECIMAL(12,2) NOT NULL,
    "discountedPrice" DECIMAL(12,2) NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_package_items" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_bookings" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "diagnosticCenterId" UUID NOT NULL,
    "paymentId" UUID,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "sampleCollectionDate" TIMESTAMP(3) NOT NULL,
    "sampleCollectionTime" TEXT NOT NULL,
    "sampleStatus" "SampleStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentStatus" "TestPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "test_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_booking_items" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "testId" UUID,
    "packageId" UUID,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_reports" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "testId" UUID,
    "reportToken" TEXT NOT NULL,
    "reportUrl" TEXT NOT NULL,
    "reportFileName" TEXT NOT NULL,
    "reportStatus" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "generatedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT true,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "reportNotifications" BOOLEAN NOT NULL DEFAULT true,
    "prescriptionReminders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "deliveryStatus" "DeliveryStatusLog" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "recipient" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "entityType" "PaymentEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethodType" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "gatewayResponse" JSONB,
    "paymentGateway" "PaymentGateway" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'INITIATED',
    "refundReason" "RefundReason" NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "methodType" "SavedMethodType" NOT NULL,
    "token" TEXT NOT NULL,
    "lastFourDigits" TEXT,
    "expiryDate" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profilePicture" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bloodGroup" TEXT,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "medicalHistory" TEXT,
    "allergies" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "hospital" TEXT,
    "biography" TEXT,
    "consultationFee" DECIMAL(12,2) NOT NULL,
    "status" "DoctorStatus" NOT NULL DEFAULT 'PENDING',
    "isProvideTeleHealth" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_availability" (
    "id" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "dayOfWeek" "DayOfWeek",
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "specificDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "reportNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_centers_name_key" ON "health_centers"("name");

-- CreateIndex
CREATE INDEX "health_centers_city_state_idx" ON "health_centers"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_vehicleNumber_key" ON "ambulances"("vehicleNumber");

-- CreateIndex
CREATE INDEX "ambulances_status_idx" ON "ambulances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ambulance_bookings_paymentId_key" ON "ambulance_bookings"("paymentId");

-- CreateIndex
CREATE INDEX "ambulance_bookings_patientId_bookedAt_idx" ON "ambulance_bookings"("patientId", "bookedAt");

-- CreateIndex
CREATE INDEX "ambulance_bookings_status_idx" ON "ambulance_bookings"("status");

-- CreateIndex
CREATE INDEX "ambulance_location_logs_ambulanceBookingId_recordedAt_idx" ON "ambulance_location_logs"("ambulanceBookingId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_paymentId_key" ON "appointments"("paymentId");

-- CreateIndex
CREATE INDEX "appointments_patientId_appointmentDate_idx" ON "appointments"("patientId", "appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_doctorId_appointmentDate_idx" ON "appointments"("doctorId", "appointmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "telehealth_appointments_paymentId_key" ON "telehealth_appointments"("paymentId");

-- CreateIndex
CREATE INDEX "telehealth_appointments_status_requestedAt_idx" ON "telehealth_appointments"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "telehealth_appointments_patientId_requestedAt_idx" ON "telehealth_appointments"("patientId", "requestedAt");

-- CreateIndex
CREATE INDEX "telehealth_appointments_doctorId_requestedAt_idx" ON "telehealth_appointments"("doctorId", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "telehealth_sessions_telehealthId_key" ON "telehealth_sessions"("telehealthId");

-- CreateIndex
CREATE UNIQUE INDEX "telehealth_sessions_videoRoomId_key" ON "telehealth_sessions"("videoRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "visit_notes_appointmentId_key" ON "visit_notes"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_appointmentId_key" ON "prescriptions"("appointmentId");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_issuedAt_idx" ON "prescriptions"("patientId", "issuedAt");

-- CreateIndex
CREATE INDEX "prescriptions_doctorId_issuedAt_idx" ON "prescriptions"("doctorId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_categories_name_key" ON "medicine_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_name_key" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "medicines_categoryId_idx" ON "medicines"("categoryId");

-- CreateIndex
CREATE INDEX "medicines_status_idx" ON "medicines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_paymentId_key" ON "orders"("paymentId");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_guestSessionId_idx" ON "orders"("guestSessionId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_medicineId_idx" ON "order_items"("medicineId");

-- CreateIndex
CREATE INDEX "stock_logs_medicineId_createdAt_idx" ON "stock_logs"("medicineId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "guest_sessions_sessionId_key" ON "guest_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "guest_sessions_expiresAt_idx" ON "guest_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_centers_name_key" ON "diagnostic_centers"("name");

-- CreateIndex
CREATE INDEX "diagnostic_centers_city_state_idx" ON "diagnostic_centers"("city", "state");

-- CreateIndex
CREATE INDEX "lab_tests_diagnosticCenterId_name_idx" ON "lab_tests"("diagnosticCenterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lab_tests_diagnosticCenterId_code_key" ON "lab_tests"("diagnosticCenterId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "test_packages_diagnosticCenterId_name_key" ON "test_packages"("diagnosticCenterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "test_package_items_packageId_testId_key" ON "test_package_items"("packageId", "testId");

-- CreateIndex
CREATE UNIQUE INDEX "test_bookings_paymentId_key" ON "test_bookings"("paymentId");

-- CreateIndex
CREATE INDEX "test_bookings_patientId_bookingDate_idx" ON "test_bookings"("patientId", "bookingDate");

-- CreateIndex
CREATE INDEX "test_bookings_diagnosticCenterId_bookingDate_idx" ON "test_bookings"("diagnosticCenterId", "bookingDate");

-- CreateIndex
CREATE INDEX "test_booking_items_bookingId_idx" ON "test_booking_items"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "test_reports_reportToken_key" ON "test_reports"("reportToken");

-- CreateIndex
CREATE INDEX "test_reports_bookingId_reportStatus_idx" ON "test_reports"("bookingId", "reportStatus");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_logs_userId_createdAt_idx" ON "notification_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_deliveryStatus_idx" ON "notification_logs"("deliveryStatus");

-- CreateIndex
CREATE INDEX "payments_userId_createdAt_idx" ON "payments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_entityType_entityId_idx" ON "payments"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE INDEX "refunds_userId_createdAt_idx" ON "refunds"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_methods_userId_isDefault_idx" ON "payment_methods"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_userId_key" ON "patient_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_userId_key" ON "doctor_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_licenseNumber_key" ON "doctor_profiles"("licenseNumber");

-- CreateIndex
CREATE INDEX "doctor_profiles_status_idx" ON "doctor_profiles"("status");

-- CreateIndex
CREATE INDEX "doctor_availability_doctorId_dayOfWeek_idx" ON "doctor_availability"("doctorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "doctor_availability_doctorId_specificDate_idx" ON "doctor_availability"("doctorId", "specificDate");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- AddForeignKey
ALTER TABLE "ambulances" ADD CONSTRAINT "ambulances_healthCenterId_fkey" FOREIGN KEY ("healthCenterId") REFERENCES "health_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_bookings" ADD CONSTRAINT "ambulance_bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_bookings" ADD CONSTRAINT "ambulance_bookings_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_bookings" ADD CONSTRAINT "ambulance_bookings_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_bookings" ADD CONSTRAINT "ambulance_bookings_originCenterId_fkey" FOREIGN KEY ("originCenterId") REFERENCES "health_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_bookings" ADD CONSTRAINT "ambulance_bookings_destinationCenterId_fkey" FOREIGN KEY ("destinationCenterId") REFERENCES "health_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_location_logs" ADD CONSTRAINT "ambulance_location_logs_ambulanceBookingId_fkey" FOREIGN KEY ("ambulanceBookingId") REFERENCES "ambulance_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_location_logs" ADD CONSTRAINT "ambulance_location_logs_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_previousAppointmentId_fkey" FOREIGN KEY ("previousAppointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telehealth_appointments" ADD CONSTRAINT "telehealth_appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telehealth_appointments" ADD CONSTRAINT "telehealth_appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telehealth_appointments" ADD CONSTRAINT "telehealth_appointments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_telehealthId_fkey" FOREIGN KEY ("telehealthId") REFERENCES "telehealth_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "medicine_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "guest_sessions"("sessionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_tests" ADD CONSTRAINT "lab_tests_diagnosticCenterId_fkey" FOREIGN KEY ("diagnosticCenterId") REFERENCES "diagnostic_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_packages" ADD CONSTRAINT "test_packages_diagnosticCenterId_fkey" FOREIGN KEY ("diagnosticCenterId") REFERENCES "diagnostic_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_package_items" ADD CONSTRAINT "test_package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "test_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_package_items" ADD CONSTRAINT "test_package_items_testId_fkey" FOREIGN KEY ("testId") REFERENCES "lab_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bookings" ADD CONSTRAINT "test_bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bookings" ADD CONSTRAINT "test_bookings_diagnosticCenterId_fkey" FOREIGN KEY ("diagnosticCenterId") REFERENCES "diagnostic_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bookings" ADD CONSTRAINT "test_bookings_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_booking_items" ADD CONSTRAINT "test_booking_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "test_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_booking_items" ADD CONSTRAINT "test_booking_items_testId_fkey" FOREIGN KEY ("testId") REFERENCES "lab_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_booking_items" ADD CONSTRAINT "test_booking_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "test_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_reports" ADD CONSTRAINT "test_reports_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "test_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_reports" ADD CONSTRAINT "test_reports_testId_fkey" FOREIGN KEY ("testId") REFERENCES "lab_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
