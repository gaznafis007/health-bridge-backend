import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AmbulanceBookingStatus,
  AmbulanceStatus,
  AppointmentStatus,
  TelehealthPresence,
  TelehealthStatus,
  TestBookingStatus,
  UserRole,
} from '@prisma/client';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async patientDashboard(user: JwtRequestUser) {
    if (user.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Patients only');
    }

    const now = new Date();
    const [
      upcomingAppointments,
      labBookings,
      ambulanceBookings,
      orders,
      reports,
      prescriptions,
      transactions,
      counts,
    ] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          patientId: user.id,
          status: AppointmentStatus.SCHEDULED,
          appointmentDate: { gte: now },
        },
        orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
        take: 5,
        include: {
          doctor: { select: { firstName: true, lastName: true } },
          healthCenter: { select: { name: true } },
        },
      }),
      this.prisma.testBooking.findMany({
        where: { patientId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { diagnosticCenter: { select: { name: true } } },
      }),
      this.prisma.ambulanceBooking.findMany({
        where: { patientId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.testReport.findMany({
        where: { booking: { patientId: user.id } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reportFileName: true,
          reportStatus: true,
          reportToken: true,
          createdAt: true,
        },
      }),
      this.prisma.prescription.findMany({
        where: { patientId: user.id },
        orderBy: { issuedAt: 'desc' },
        take: 5,
      }),
      this.prisma.payment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          amount: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
        },
      }),
      Promise.all([
        this.prisma.appointment.count({ where: { patientId: user.id } }),
        this.prisma.testBooking.count({ where: { patientId: user.id } }),
        this.prisma.order.count({ where: { userId: user.id } }),
        this.prisma.telehealthAppointment.count({ where: { patientId: user.id } }),
      ]),
    ]);

    return {
      upcomingAppointments,
      recentLabBookings: labBookings,
      recentAmbulanceBookings: ambulanceBookings,
      recentOrders: orders.map((o) => ({
        ...o,
        totalAmount: o.totalAmount.toString(),
        finalAmount: o.finalAmount.toString(),
      })),
      recentReports: reports,
      recentPrescriptions: prescriptions,
      recentTransactions: transactions.map((t) => ({
        ...t,
        amount: t.amount.toString(),
      })),
      counts: {
        appointments: counts[0],
        labBookings: counts[1],
        orders: counts[2],
        telehealth: counts[3],
      },
    };
  }

  async doctorDashboard(user: JwtRequestUser) {
    if (user.role !== UserRole.DOCTOR) {
      throw new ForbiddenException('Doctors only');
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const startOfMonth = new Date(startOfDay);
    startOfMonth.setUTCDate(1);
    const endNext7 = new Date(startOfDay);
    endNext7.setUTCDate(endNext7.getUTCDate() + 7);

    const [
      todayAppointments,
      scheduledCount,
      completedCount,
      cancelledCount,
      next7DaysCount,
      completedThisMonth,
      profile,
      availability,
      pendingOffers,
      telehealthCompletedMonth,
    ] = await Promise.all([
        this.prisma.appointment.findMany({
          where: {
            doctorId: user.id,
            appointmentDate: { gte: startOfDay, lt: endOfDay },
          },
          orderBy: { appointmentTime: 'asc' },
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
            healthCenter: { select: { name: true } },
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: user.id,
            status: AppointmentStatus.SCHEDULED,
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: user.id,
            status: AppointmentStatus.COMPLETED,
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: user.id,
            status: AppointmentStatus.CANCELLED,
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: user.id,
            status: AppointmentStatus.SCHEDULED,
            appointmentDate: { gte: startOfDay, lt: endNext7 },
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: user.id,
            status: AppointmentStatus.COMPLETED,
            createdAt: { gte: startOfMonth },
          },
        }),
        this.prisma.doctorProfile.findUnique({ where: { userId: user.id } }),
        this.prisma.doctorAvailability.findMany({
          where: { doctor: { userId: user.id } },
          include: { healthCenter: { select: { name: true } } },
        }),
        this.prisma.telehealthAppointment.count({
          where: {
            doctorId: user.id,
            status: TelehealthStatus.REQUESTED,
            offerExpiresAt: { gt: new Date() },
          },
        }),
        this.prisma.telehealthAppointment.count({
          where: {
            doctorId: user.id,
            status: TelehealthStatus.COMPLETED,
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

    const feesToday = todayAppointments
      .filter((a) => a.status === AppointmentStatus.COMPLETED)
      .reduce((sum, a) => sum + Number(a.consultationFee), 0);

    const effectiveAvailability = this.effectiveAvailability(profile);

    return {
      todayAppointments: todayAppointments.map((a) => ({
        ...a,
        consultationFee: a.consultationFee.toString(),
      })),
      counts: {
        scheduled: scheduledCount,
        completed: completedCount,
        cancelled: cancelledCount,
        next7DaysScheduled: next7DaysCount,
        completedThisMonth,
      },
      feesEarnedToday: feesToday.toFixed(2),
      availability: availability.map((a) => ({
        id: a.id,
        healthCenterName: a.healthCenter.name,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        slotDurationMinutes: a.slotDurationMinutes,
        isRecurring: a.isRecurring,
        specificDate: a.specificDate?.toISOString() ?? null,
      })),
      telehealth: {
        isProvideTeleHealth: profile?.isProvideTeleHealth ?? false,
        presence: profile?.telehealthPresence ?? TelehealthPresence.OFFLINE,
        effectiveAvailability,
        onlineUntil: profile?.telehealthOnlineUntil?.toISOString() ?? null,
        pendingOffers,
        completedThisMonth: telehealthCompletedMonth,
        rating: profile?.rating ?? 0,
      },
    };
  }

  private effectiveAvailability(
    profile: {
      telehealthPresence: TelehealthPresence;
      telehealthOnlineUntil: Date | null;
      activeTelehealthId: string | null;
      isProvideTeleHealth: boolean;
    } | null,
  ): 'ONLINE' | 'BUSY' | 'IN_CALL' | 'OFFLINE' {
    if (!profile?.isProvideTeleHealth) return 'OFFLINE';
    if (profile.activeTelehealthId) return 'IN_CALL';
    if (profile.telehealthPresence === TelehealthPresence.BUSY) return 'BUSY';
    if (
      profile.telehealthPresence === TelehealthPresence.ONLINE &&
      profile.telehealthOnlineUntil &&
      profile.telehealthOnlineUntil > new Date()
    ) {
      return 'ONLINE';
    }
    return 'OFFLINE';
  }

  async adminDashboard() {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [
      ordersToday,
      labBookingsToday,
      ambulanceActive,
      appointmentsToday,
      fleetAvailable,
      fleetOnDuty,
      telehealthWaiting,
      telehealthActive,
      telehealthMissedToday,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.testBooking.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.ambulanceBooking.count({
        where: {
          status: {
            in: [
              AmbulanceBookingStatus.REQUESTED,
              AmbulanceBookingStatus.ACCEPTED,
              AmbulanceBookingStatus.ARRIVED,
              AmbulanceBookingStatus.IN_TRANSIT,
            ],
          },
        },
      }),
      this.prisma.appointment.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.ambulance.count({
        where: { status: AmbulanceStatus.AVAILABLE },
      }),
      this.prisma.ambulance.count({
        where: { status: AmbulanceStatus.ON_DUTY },
      }),
      this.prisma.telehealthAppointment.count({
        where: {
          status: TelehealthStatus.REQUESTED,
          doctorId: null,
        },
      }),
      this.prisma.telehealthAppointment.count({
        where: { status: { in: [TelehealthStatus.ACTIVE, TelehealthStatus.DOCTOR_JOINED, TelehealthStatus.PATIENT_JOINED] } },
      }),
      this.prisma.telehealthAppointment.count({
        where: {
          status: TelehealthStatus.MISSED,
          createdAt: { gte: startOfDay },
        },
      }),
    ]);

    const pendingLabPayments = await this.prisma.testBooking.count({
      where: { bookingStatus: TestBookingStatus.PENDING_PAYMENT },
    });

    return {
      today: {
        orders: ordersToday,
        labBookings: labBookingsToday,
        appointments: appointmentsToday,
      },
      ambulance: {
        activeBookings: ambulanceActive,
        fleetAvailable,
        fleetOnDuty,
      },
      lab: { pendingPaymentBookings: pendingLabPayments },
      telehealth: {
        waitingRequests: telehealthWaiting,
        activeSessions: telehealthActive,
        missedToday: telehealthMissedToday,
      },
    };
  }
}
