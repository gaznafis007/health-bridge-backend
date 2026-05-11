import { SampleStatus, ReportStatus, TestBookingStatus } from '@prisma/client';

export const LAB_TEST_SWAGGER_TAG = 'Lab Test';

/** Idempotency TTL for booking creation (24 h). */
export const LAB_IDEMPOTENCY_TTL_S = 86_400;

/** Maximum allowed file size for report uploads (10 MB). */
export const MAX_REPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for report uploads. */
export const ALLOWED_REPORT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

/**
 * Valid sample status transitions.
 * Key = current status, value = allowed next statuses.
 */
export const SAMPLE_TRANSITIONS: Record<SampleStatus, SampleStatus[]> = {
  [SampleStatus.PENDING]:    [SampleStatus.COLLECTED],
  [SampleStatus.COLLECTED]:  [SampleStatus.PROCESSING],
  [SampleStatus.PROCESSING]: [SampleStatus.COMPLETED],
  [SampleStatus.COMPLETED]:  [SampleStatus.DELIVERED],
  [SampleStatus.DELIVERED]:  [],
};

/**
 * Valid report status transitions.
 */
export const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.PENDING]:   [ReportStatus.READY],
  [ReportStatus.READY]:     [ReportStatus.DELIVERED],
  [ReportStatus.DELIVERED]: [ReportStatus.ARCHIVED],
  [ReportStatus.ARCHIVED]:  [],
};

/**
 * Valid booking status transitions.
 */
export const BOOKING_STATUS_TRANSITIONS: Record<TestBookingStatus, TestBookingStatus[]> = {
  [TestBookingStatus.PENDING_PAYMENT]: [
    TestBookingStatus.CONFIRMED,
    TestBookingStatus.CANCELLED,
  ],
  [TestBookingStatus.CONFIRMED]:  [TestBookingStatus.CANCELLED, TestBookingStatus.COMPLETED],
  [TestBookingStatus.CANCELLED]:  [],
  [TestBookingStatus.COMPLETED]:  [],
};
