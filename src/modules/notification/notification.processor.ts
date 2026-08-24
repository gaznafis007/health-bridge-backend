import { Injectable, Logger } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import {
  DeliveryStatusLog,
  NotificationCategory,
  NotificationType,
} from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { NOTIFICATION_JOB_TYPES, NotificationJobType } from './constants/notification.constants';
import { NotificationRepository } from './repositories/notification.repository';

export type NotificationJobPayload = {
  userId: string;
  recipient: string;
  type: NotificationJobType;
  subject?: string;
  data: Record<string, string>;
};

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly mail: MailService,
    private readonly repo: NotificationRepository,
  ) {}

  bindWorker(connection: { host: string; port: number; password?: string }) {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(
      'notifications',
      async (job: Job<NotificationJobPayload>) => this.handle(job),
      { connection },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });
  }

  async close() {
    await this.worker?.close();
    this.worker = null;
  }

  private async handle(job: Job<NotificationJobPayload>) {
    const { userId, recipient, type, data } = job.data;
    const prefs = await this.repo.findPreference(userId);

    if (prefs && !prefs.emailNotifications) {
      await this.repo.createLog({
        userId,
        notificationType: NotificationType.EMAIL,
        category: this.categoryFor(type),
        subject: job.data.subject,
        content: JSON.stringify(data),
        recipient,
        deliveryStatus: DeliveryStatusLog.FAILED,
        failureReason: 'User disabled email notifications',
      });
      return;
    }

    try {
      switch (type) {
        case NOTIFICATION_JOB_TYPES.REPORT_READY:
          await this.mail.sendReportReady({
            to: recipient,
            patientName: data.patientName,
            centerName: data.centerName,
            reportToken: data.reportToken,
          });
          break;
        case NOTIFICATION_JOB_TYPES.EMAIL_VERIFICATION:
          await this.mail.sendEmailVerification({
            to: recipient,
            verifyUrl: data.verifyUrl,
            firstName: data.firstName,
          });
          break;
        case NOTIFICATION_JOB_TYPES.TELEHEALTH_OFFER:
        case NOTIFICATION_JOB_TYPES.TELEHEALTH_ACCEPTED:
        case NOTIFICATION_JOB_TYPES.TELEHEALTH_COMPLETED:
        case NOTIFICATION_JOB_TYPES.TELEHEALTH_MISSED:
          this.logger.log(
            `Telehealth notification ${type} for ${recipient}: ${JSON.stringify(data)}`,
          );
          break;
        default:
          this.logger.log(`Notification job ${type} for ${recipient}: ${JSON.stringify(data)}`);
      }

      await this.repo.createLog({
        userId,
        notificationType: NotificationType.EMAIL,
        category: this.categoryFor(type),
        subject: job.data.subject ?? type,
        content: JSON.stringify(data),
        recipient,
        deliveryStatus: DeliveryStatusLog.SENT,
        sentAt: new Date(),
      });
    } catch (error) {
      await this.repo.createLog({
        userId,
        notificationType: NotificationType.EMAIL,
        category: this.categoryFor(type),
        subject: job.data.subject,
        content: JSON.stringify(data),
        recipient,
        deliveryStatus: DeliveryStatusLog.FAILED,
        failureReason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private categoryFor(type: NotificationJobType): NotificationCategory {
    switch (type) {
      case NOTIFICATION_JOB_TYPES.REPORT_READY:
        return NotificationCategory.REPORT;
      case NOTIFICATION_JOB_TYPES.APPOINTMENT_REMINDER:
        return NotificationCategory.APPOINTMENT;
      case NOTIFICATION_JOB_TYPES.ORDER_STATUS:
        return NotificationCategory.ORDER;
      case NOTIFICATION_JOB_TYPES.LAB_BOOKING_CONFIRMED:
        return NotificationCategory.REPORT;
      case NOTIFICATION_JOB_TYPES.AMBULANCE_ACCEPTED:
        return NotificationCategory.TRANSACTION;
      case NOTIFICATION_JOB_TYPES.TELEHEALTH_OFFER:
      case NOTIFICATION_JOB_TYPES.TELEHEALTH_ACCEPTED:
      case NOTIFICATION_JOB_TYPES.TELEHEALTH_COMPLETED:
      case NOTIFICATION_JOB_TYPES.TELEHEALTH_MISSED:
        return NotificationCategory.APPOINTMENT;
      case NOTIFICATION_JOB_TYPES.EMAIL_VERIFICATION:
        return NotificationCategory.TRANSACTION;
      default:
        return NotificationCategory.TRANSACTION;
    }
  }
}
