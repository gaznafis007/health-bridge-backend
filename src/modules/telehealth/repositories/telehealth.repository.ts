import { Injectable } from '@nestjs/common';
import {
  DoctorStatus,
  PaymentEntityType,
  PaymentGateway,
  PaymentMethodType,
  PaymentStatus,
  Prisma,
  TelehealthPresence,
  TelehealthSessionStatus,
  TelehealthStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const requestInclude = {
  patient: {
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
  },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      doctorProfile: { select: { specialization: true } },
    },
  },
  session: true,
} satisfies Prisma.TelehealthAppointmentInclude;

@Injectable()
export class TelehealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.telehealthAppointment.findUnique({
      where: { id },
      include: requestInclude,
    });
  }

  listPatientRequests(patientId: string, skip: number, take: number) {
    return Promise.all([
      this.prisma.telehealthAppointment.findMany({
        where: { patientId },
        include: requestInclude,
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.telehealthAppointment.count({ where: { patientId } }),
    ]);
  }

  listDoctorInbox(doctorId: string) {
    return this.prisma.telehealthAppointment.findMany({
      where: {
        doctorId,
        status: TelehealthStatus.REQUESTED,
        offerExpiresAt: { gt: new Date() },
      },
      include: requestInclude,
      orderBy: { requestedAt: 'asc' },
    });
  }

  listAdmin(query: {
    status?: TelehealthStatus;
    from?: Date;
    to?: Date;
    skip: number;
    take: number;
  }) {
    const where: Prisma.TelehealthAppointmentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            requestedAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };
    return Promise.all([
      this.prisma.telehealthAppointment.findMany({
        where,
        include: requestInclude,
        orderBy: { requestedAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.telehealthAppointment.count({ where }),
    ]);
  }

  createRequest(data: {
    patientId: string;
    consultationFee: Prisma.Decimal;
    searchExpiresAt: Date;
    reasonForVisit?: string;
    emergencyType?: string;
    notes?: string;
    queuePriority?: number;
  }) {
    return this.prisma.telehealthAppointment.create({
      data: {
        patientId: data.patientId,
        consultationFee: data.consultationFee,
        searchExpiresAt: data.searchExpiresAt,
        reasonForVisit: data.reasonForVisit,
        emergencyType: data.emergencyType,
        notes: data.notes,
        queuePriority: data.queuePriority ?? 0,
        status: TelehealthStatus.REQUESTED,
      },
      include: requestInclude,
    });
  }

  findEligibleCandidates(excludeDoctorIds: string[], now: Date) {
    return this.prisma.doctorProfile.findMany({
      where: {
        status: DoctorStatus.ACTIVE,
        isProvideTeleHealth: true,
        telehealthPresence: TelehealthPresence.ONLINE,
        telehealthOnlineUntil: { gt: now },
        activeTelehealthId: null,
        userId: { notIn: excludeDoctorIds },
      },
      select: {
        id: true,
        userId: true,
        consultationFee: true,
        specialization: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  findDoctorProfileByUserId(userId: string) {
    return this.prisma.doctorProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  countPendingOffers(doctorUserId: string) {
    return this.prisma.telehealthAppointment.count({
      where: {
        doctorId: doctorUserId,
        status: TelehealthStatus.REQUESTED,
        offerExpiresAt: { gt: new Date() },
      },
    });
  }

  findWaitingQueue(now: Date, limit = 1) {
    return this.prisma.telehealthAppointment.findMany({
      where: {
        status: TelehealthStatus.REQUESTED,
        doctorId: null,
        searchExpiresAt: { gt: now },
      },
      orderBy: [{ queuePriority: 'desc' }, { requestedAt: 'asc' }],
      take: limit,
      include: requestInclude,
    });
  }

  findExpiredOffers(now: Date) {
    return this.prisma.telehealthAppointment.findMany({
      where: {
        status: TelehealthStatus.REQUESTED,
        doctorId: { not: null },
        offerExpiresAt: { lt: now },
      },
      include: requestInclude,
    });
  }

  findExpiredSearches(now: Date) {
    return this.prisma.telehealthAppointment.findMany({
      where: {
        status: TelehealthStatus.REQUESTED,
        searchExpiresAt: { lte: now },
      },
      include: requestInclude,
    });
  }

  findStaleClaims() {
    return this.prisma.doctorProfile.findMany({
      where: { activeTelehealthId: { not: null } },
      select: {
        userId: true,
        activeTelehealthId: true,
      },
    });
  }

  async claimDoctorAndOffer(
    telehealthId: string,
    doctorUserId: string,
    offerExpiresAt: Date,
    consultationFee: Prisma.Decimal,
    attemptedDoctorIds: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.doctorProfile.updateMany({
        where: { userId: doctorUserId, activeTelehealthId: null },
        data: { activeTelehealthId: telehealthId },
      });
      if (claim.count === 0) return null;

      const updated = await tx.telehealthAppointment.update({
        where: { id: telehealthId },
        data: {
          doctorId: doctorUserId,
          offerExpiresAt,
          consultationFee,
          offerAttempts: { increment: 1 },
          attemptedDoctorIds,
        },
        include: requestInclude,
      });
      return updated;
    });
  }

  releaseDoctorClaim(doctorUserId: string, telehealthId: string) {
    return this.prisma.doctorProfile.updateMany({
      where: { userId: doctorUserId, activeTelehealthId: telehealthId },
      data: { activeTelehealthId: null },
    });
  }

  clearDoctorClaimByTelehealthId(telehealthId: string) {
    return this.prisma.doctorProfile.updateMany({
      where: { activeTelehealthId: telehealthId },
      data: { activeTelehealthId: null },
    });
  }

  queueRequest(telehealthId: string, attemptedDoctorIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.telehealthAppointment.findUnique({
        where: { id: telehealthId },
        select: { doctorId: true },
      });
      if (row?.doctorId) {
        await tx.doctorProfile.updateMany({
          where: { userId: row.doctorId, activeTelehealthId: telehealthId },
          data: { activeTelehealthId: null },
        });
      }
      return tx.telehealthAppointment.update({
        where: { id: telehealthId },
        data: {
          doctorId: null,
          offerExpiresAt: null,
          attemptedDoctorIds,
        },
        include: requestInclude,
      });
    });
  }

  acceptOffer(telehealthId: string, doctorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const res = await tx.telehealthAppointment.updateMany({
        where: {
          id: telehealthId,
          doctorId: doctorUserId,
          status: TelehealthStatus.REQUESTED,
          offerExpiresAt: { gt: new Date() },
        },
        data: {
          status: TelehealthStatus.ACCEPTED,
          acceptedAt: new Date(),
          offerExpiresAt: null,
          version: { increment: 1 },
        },
      });
      if (res.count === 0) return null;
      return tx.telehealthAppointment.findUnique({
        where: { id: telehealthId },
        include: requestInclude,
      });
    });
  }

  markMissed(telehealthId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.telehealthAppointment.findUnique({
        where: { id: telehealthId },
        select: { doctorId: true, status: true },
      });
      if (!row || row.status !== TelehealthStatus.REQUESTED) return null;

      if (row.doctorId) {
        await tx.doctorProfile.updateMany({
          where: { userId: row.doctorId, activeTelehealthId: telehealthId },
          data: { activeTelehealthId: null },
        });
      }

      return tx.telehealthAppointment.update({
        where: { id: telehealthId },
        data: {
          status: TelehealthStatus.MISSED,
          doctorId: null,
          offerExpiresAt: null,
        },
        include: requestInclude,
      });
    });
  }

  cancelRequest(telehealthId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.telehealthAppointment.findUnique({
        where: { id: telehealthId },
        select: { doctorId: true, status: true },
      });
      if (!row) return null;

      if (row.doctorId) {
        await tx.doctorProfile.updateMany({
          where: { userId: row.doctorId, activeTelehealthId: telehealthId },
          data: { activeTelehealthId: null },
        });
      }

      return tx.telehealthAppointment.update({
        where: { id: telehealthId },
        data: {
          status: TelehealthStatus.CANCELLED,
          cancelledAt: new Date(),
          offerExpiresAt: null,
        },
        include: requestInclude,
      });
    });
  }

  updatePresence(
    userId: string,
    presence: TelehealthPresence,
    onlineUntil: Date | null,
  ) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: { telehealthPresence: presence, telehealthOnlineUntil: onlineUntil },
    });
  }

  createSession(telehealthId: string, roomId: string, roomHandle: string) {
    return this.prisma.telehealthSession.create({
      data: {
        telehealthId,
        videoRoomId: roomId,
        videoRoomToken: roomHandle,
        status: TelehealthSessionStatus.PENDING,
      },
    });
  }

  findSessionByTelehealthId(telehealthId: string) {
    return this.prisma.telehealthSession.findUnique({
      where: { telehealthId },
    });
  }

  updateStatus(
    telehealthId: string,
    status: TelehealthStatus,
    extra?: Partial<{
      startedAt: Date;
      endedAt: Date;
      durationMinutes: number;
    }>,
  ) {
    return this.prisma.telehealthAppointment.update({
      where: { id: telehealthId },
      data: { status, ...extra },
      include: requestInclude,
    });
  }

  completeWithPayment(
    telehealthId: string,
    patientId: string,
    amount: Prisma.Decimal,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.telehealthAppointment.findUnique({
        where: { id: telehealthId },
        select: { paymentId: true, doctorId: true },
      });
      if (!fresh) return null;
      if (fresh.paymentId) {
        return tx.telehealthAppointment.findUnique({
          where: { id: telehealthId },
          include: requestInclude,
        });
      }

      const payment = await tx.payment.create({
        data: {
          entityType: PaymentEntityType.TELEHEALTH_APPOINTMENT,
          entityId: telehealthId,
          userId: patientId,
          amount,
          paymentMethod: PaymentMethodType.CASH,
          paymentStatus: PaymentStatus.PENDING_CASH,
          paymentGateway: PaymentGateway.MANUAL,
        },
      });

      if (fresh.doctorId) {
        await tx.doctorProfile.updateMany({
          where: { userId: fresh.doctorId, activeTelehealthId: telehealthId },
          data: { activeTelehealthId: null },
        });
      }

      return tx.telehealthAppointment.update({
        where: { id: telehealthId },
        data: {
          status: TelehealthStatus.COMPLETED,
          endedAt: new Date(),
          paymentId: payment.id,
        },
        include: requestInclude,
      });
    });
  }
}
