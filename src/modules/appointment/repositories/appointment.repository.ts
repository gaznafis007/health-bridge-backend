import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  DoctorStatus,
  Prisma,
} from '@prisma/client';
import type { DoctorAvailability } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  listHealthCenters() {
    return this.prisma.healthCenter.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        email: true,
        type: true,
      },
    });
  }

  findActiveDoctorProfilesBySpecialization(
    specializationSubstring: string,
    options?: { healthCenterId?: string },
  ) {
    return this.prisma.doctorProfile.findMany({
      where: {
        status: DoctorStatus.ACTIVE,
        specialization: {
          contains: specializationSubstring.trim(),
          mode: 'insensitive',
        },
        ...(options?.healthCenterId
          ? {
              availabilities: {
                some: { healthCenterId: options.healthCenterId },
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { specialization: 'asc' },
    });
  }

  findAvailabilitiesWithCenters(doctorProfileId: string) {
    return this.prisma.doctorAvailability.findMany({
      where: { doctorId: doctorProfileId },
      include: { healthCenter: true },
    });
  }

  async findDoctorUserAndProfile(
    doctorUserId: string,
    mustBeActive: boolean,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: doctorUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        doctorProfile: true,
      },
    });
    if (!user?.doctorProfile) {
      return null;
    }
    if (mustBeActive && user.doctorProfile.status !== DoctorStatus.ACTIVE) {
      return null;
    }
    return user;
  }

  async healthCenterExists(id: string) {
    const c = await this.prisma.healthCenter.findUnique({
      where: { id },
      select: { id: true },
    });
    return Boolean(c);
  }

  findDoctorProfileOnly(userId: string) {
    return this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
  }

  /** Rule + owning doctor profile + venue (booking context). */
  findAvailabilityRuleBookingContext(ruleId: string) {
    return this.prisma.doctorAvailability.findUnique({
      where: { id: ruleId },
      include: {
        doctor: true,
        healthCenter: true,
      },
    });
  }

  findBookedIntervals(doctorUserId: string, utcMidnightDay: Date) {
    return this.prisma.appointment.findMany({
      where: {
        doctorId: doctorUserId,
        appointmentDate: utcMidnightDay,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
      },
      select: {
        appointmentTime: true,
        durationMinutes: true,
      },
    });
  }

  createAppointment(createData: Prisma.AppointmentUncheckedCreateInput) {
    return this.prisma.appointment.create({
      data: createData,
      include: { healthCenter: true },
    });
  }

  listPatientAppointments(
    patientId: string,
    params: { skip: number; take: number },
  ) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: [{ appointmentDate: 'desc' }, { appointmentTime: 'desc' }],
      skip: params.skip,
      take: params.take,
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true, phone: true } },
        healthCenter: true,
      },
    });
  }

  countPatientAppointments(patientId: string) {
    return this.prisma.appointment.count({
      where: { patientId },
    });
  }

  listDoctorAppointmentsInRange(
    doctorUserId: string,
    startUtcInclusive: Date,
    endUtcExclusive: Date,
    filters?: { healthCenterId?: string },
  ) {
    return this.prisma.appointment.findMany({
      where: {
        doctorId: doctorUserId,
        ...(filters?.healthCenterId
          ? { healthCenterId: filters.healthCenterId }
          : {}),
        appointmentDate: {
          gte: startUtcInclusive,
          lt: endUtcExclusive,
        },
      },
      orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        healthCenter: true,
      },
    });
  }

  createAvailabilityRow(data: {
    doctorId: string;
    healthCenterId: string;
    dayOfWeek: DoctorAvailability['dayOfWeek'];
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    isRecurring: boolean;
    specificDate: Date | null;
  }) {
    return this.prisma.doctorAvailability.create({
      data,
      include: { healthCenter: true },
    });
  }

  updateAvailabilityRow(
    id: string,
    patch: Prisma.DoctorAvailabilityUncheckedUpdateInput,
  ) {
    return this.prisma.doctorAvailability.update({
      where: { id },
      data: patch,
      include: { healthCenter: true },
    });
  }

  deleteAvailability(id: string, doctorProfileId: string) {
    return this.prisma.doctorAvailability.deleteMany({
      where: {
        id,
        doctorId: doctorProfileId,
      },
    });
  }

  findAvailabilityOwnership(id: string, doctorProfileId: string) {
    return this.prisma.doctorAvailability.findFirst({
      where: {
        id,
        doctorId: doctorProfileId,
      },
      include: { healthCenter: true },
    });
  }

  loadDoctorAvailabilitiesForOverlap(doctorProfileId: string) {
    return this.prisma.doctorAvailability.findMany({
      where: { doctorId: doctorProfileId },
    });
  }

  findAppointmentById(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        healthCenter: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
        visitNote: true,
        prescription: true,
      },
    });
  }

  updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
    extra?: { cancelledAt?: Date; notes?: string },
  ) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(extra?.cancelledAt && { cancelledAt: extra.cancelledAt }),
        ...(extra?.notes !== undefined && { notes: extra.notes }),
      },
      include: { healthCenter: true },
    });
  }

  upsertVisitNote(
    appointmentId: string,
    data: {
      diagnosis?: string;
      treatmentPlan?: string;
      notes?: string;
    },
  ) {
    return this.prisma.visitNote.upsert({
      where: { appointmentId },
      create: { appointmentId, ...data },
      update: data,
    });
  }

  findVisitNote(appointmentId: string) {
    return this.prisma.visitNote.findUnique({ where: { appointmentId } });
  }

  createPrescription(data: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    medicines: object;
    notes?: string;
    issuedAt: Date;
    expiryDate?: Date;
  }) {
    return this.prisma.prescription.create({
      data: {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        medicines: data.medicines,
        notes: data.notes,
        issuedAt: data.issuedAt,
        expiryDate: data.expiryDate,
      },
    });
  }

  findPrescriptionByAppointment(appointmentId: string) {
    return this.prisma.prescription.findUnique({
      where: { appointmentId },
    });
  }

  listPatientPrescriptions(patientId: string, skip: number, take: number) {
    return Promise.all([
      this.prisma.prescription.findMany({
        where: { patientId },
        orderBy: { issuedAt: 'desc' },
        skip,
        take,
        include: {
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              appointmentTime: true,
            },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.prescription.count({ where: { patientId } }),
    ]);
  }
}
