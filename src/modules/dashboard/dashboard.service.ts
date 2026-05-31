import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AmbulanceBookingStatus,
  AmbulanceStatus,
  AppointmentStatus,
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

    const [todayAppointments, scheduledCount, completedCount, cancelledCount] =
      await Promise.all([
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
      ]);

    const feesToday = todayAppointments
      .filter((a) => a.status === AppointmentStatus.COMPLETED)
      .reduce((sum, a) => sum + Number(a.consultationFee), 0);

    return {
      todayAppointments: todayAppointments.map((a) => ({
        ...a,
        consultationFee: a.consultationFee.toString(),
      })),
      counts: {
        scheduled: scheduledCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
      feesEarnedToday: feesToday.toFixed(2),
    };
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
    };
  }
}
