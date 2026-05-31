import { Injectable } from '@nestjs/common';
import {
  DeliveryStatusLog,
  NotificationCategory,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateNotificationPreferenceDto } from '../dto/notification-preference.dto';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPreference(userId: string) {
    return this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }

  upsertPreference(userId: string, dto: UpdateNotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailNotifications: dto.emailNotifications ?? true,
        smsNotifications: dto.smsNotifications ?? true,
        appointmentReminders: dto.appointmentReminders ?? true,
        orderUpdates: dto.orderUpdates ?? true,
        reportNotifications: dto.reportNotifications ?? true,
        prescriptionReminders: dto.prescriptionReminders ?? true,
      },
      update: {
        ...(dto.emailNotifications !== undefined && {
          emailNotifications: dto.emailNotifications,
        }),
        ...(dto.smsNotifications !== undefined && {
          smsNotifications: dto.smsNotifications,
        }),
        ...(dto.appointmentReminders !== undefined && {
          appointmentReminders: dto.appointmentReminders,
        }),
        ...(dto.orderUpdates !== undefined && {
          orderUpdates: dto.orderUpdates,
        }),
        ...(dto.reportNotifications !== undefined && {
          reportNotifications: dto.reportNotifications,
        }),
        ...(dto.prescriptionReminders !== undefined && {
          prescriptionReminders: dto.prescriptionReminders,
        }),
      },
    });
  }

  createLog(data: {
    userId: string;
    notificationType: NotificationType;
    category: NotificationCategory;
    subject?: string;
    content: string;
    recipient: string;
    deliveryStatus: DeliveryStatusLog;
    failureReason?: string;
    sentAt?: Date;
  }) {
    return this.prisma.notificationLog.create({ data });
  }

  listLogs(userId: string, skip: number, take: number) {
    return Promise.all([
      this.prisma.notificationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notificationLog.count({ where: { userId } }),
    ]);
  }
}
