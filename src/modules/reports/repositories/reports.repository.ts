import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  PaymentEntityType,
  PaymentGateway,
  PaymentMethodType,
  PaymentStatus,
  Prisma,
  TelehealthStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { ReportGranularity } from '../constants/reports.constants';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  revenueByBucket(from: Date, to: Date, granularity: ReportGranularity) {
    const trunc =
      granularity === 'month'
        ? Prisma.sql`date_trunc('month', "createdAt")`
        : granularity === 'week'
          ? Prisma.sql`date_trunc('week', "createdAt")`
          : Prisma.sql`date_trunc('day', "createdAt")`;

    return this.prisma.$queryRaw<
      Array<{
        bucket: Date;
        entityType: PaymentEntityType;
        paymentStatus: string;
        total: Prisma.Decimal;
        count: bigint;
      }>
    >`
      SELECT ${trunc} AS bucket,
             "entityType",
             "paymentStatus",
             SUM(amount) AS total,
             COUNT(*)::bigint AS count
      FROM payments
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY bucket, "entityType", "paymentStatus"
      ORDER BY bucket ASC
    `;
  }

  orderStatusCounts(from: Date, to: Date) {
    return this.prisma.order.groupBy({
      by: ['deliveryStatus'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
    });
  }

  labBookingStatusCounts(from: Date, to: Date) {
    return this.prisma.testBooking.groupBy({
      by: ['bookingStatus'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
    });
  }

  appointmentStatusCounts(from: Date, to: Date) {
    return this.prisma.appointment.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
    });
  }

  telehealthStatusCounts(from: Date, to: Date) {
    return this.prisma.telehealthAppointment.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
    });
  }

  ambulanceStatusCounts(from: Date, to: Date) {
    return this.prisma.ambulanceBooking.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
    });
  }

  doctorStats(from: Date, to: Date, skip: number, take: number) {
    return this.prisma.doctorProfile.findMany({
      skip,
      take,
      select: {
        userId: true,
        specialization: true,
        rating: true,
        totalRatings: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { rating: 'desc' },
    });
  }

  countDoctors() {
    return this.prisma.doctorProfile.count();
  }

  countCompletedAppointments(doctorUserId: string, from: Date, to: Date) {
    return this.prisma.appointment.count({
      where: {
        doctorId: doctorUserId,
        status: AppointmentStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
      },
    });
  }

  countCompletedTelehealth(doctorUserId: string, from: Date, to: Date) {
    return this.prisma.telehealthAppointment.count({
      where: {
        doctorId: doctorUserId,
        status: TelehealthStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
      },
    });
  }

  sumAppointmentFees(doctorUserId: string, from: Date, to: Date) {
    return this.prisma.appointment.aggregate({
      where: {
        doctorId: doctorUserId,
        status: AppointmentStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
      },
      _sum: { consultationFee: true },
    });
  }

  sumTelehealthFees(doctorUserId: string, from: Date, to: Date) {
    return this.prisma.telehealthAppointment.aggregate({
      where: {
        doctorId: doctorUserId,
        status: TelehealthStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
      },
      _sum: { consultationFee: true },
    });
  }

  topMedicines(from: Date, to: Date, take: number) {
    return this.prisma.orderItem.groupBy({
      by: ['medicineId'],
      where: { order: { createdAt: { gte: from, lte: to } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take,
    });
  }

  topTests(from: Date, to: Date, take: number) {
    return this.prisma.testBookingItem.groupBy({
      by: ['testId'],
      where: {
        testId: { not: null },
        booking: { createdAt: { gte: from, lte: to } },
      },
      _count: true,
      orderBy: { _count: { testId: 'desc' } },
      take,
    });
  }
}
