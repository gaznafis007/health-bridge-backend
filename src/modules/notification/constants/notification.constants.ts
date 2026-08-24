export const NOTIFICATION_QUEUE_NAME = 'notifications';

export const NOTIFICATION_JOB_TYPES = {
  REPORT_READY: 'report-ready',
  APPOINTMENT_REMINDER: 'appointment-reminder',
  ORDER_STATUS: 'order-status',
  LAB_BOOKING_CONFIRMED: 'lab-booking-confirmed',
  AMBULANCE_ACCEPTED: 'ambulance-accepted',
  TELEHEALTH_OFFER: 'telehealth-offer',
  TELEHEALTH_ACCEPTED: 'telehealth-accepted',
  TELEHEALTH_COMPLETED: 'telehealth-completed',
  TELEHEALTH_MISSED: 'telehealth-missed',
  EMAIL_VERIFICATION: 'email-verification',
} as const;

export type NotificationJobType =
  (typeof NOTIFICATION_JOB_TYPES)[keyof typeof NOTIFICATION_JOB_TYPES];
