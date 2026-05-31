import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  DoctorAvailability,
  DoctorStatus,
  HealthCenter,
  Prisma,
  UserRole,
} from '@prisma/client';

import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { NOTIFICATION_JOB_TYPES } from '../notification/constants/notification.constants';
import { NotificationService } from '../notification/notification.service';
import {
  APPOINTMENT_DOCTOR_SCHEDULE_INCLUSIVE_DAY_TAIL,
} from './constants/appointment.constants';
import {
  BookAppointmentDto,
  CreateAvailabilityDto,
  DoctorBookingDateQueryDto,
  DoctorScheduleQueryDto,
  AppointmentListQueryDto,
  SearchDoctorsQueryDto,
  UpdateAvailabilityDto,
} from './dto/appointment.dto';
import {
  CancelAppointmentDto,
  CreatePrescriptionDto,
  CreateVisitNoteDto,
  PrescriptionListQueryDto,
} from './dto/appointment-action.dto';
import type {
  AppointmentSlotDto,
  AppointmentSlotGroupDto,
} from './dto/appointment-response.dto';
import { AppointmentRepository } from './repositories/appointment.repository';
import {
  addUtcCalendarDays,
  formatUtcDateYmd,
  generateSlotStartTimes,
  intervalsOverlapMinuteRanges,
  parseUtcDateOnly,
  timeToMinutes,
} from './utils/appointment-slot.util';
import {
  availabilityAppliesOnUtcDay,
  availabilitiesOverlap,
} from './utils/availability-calendar.util';

type HealthCentreBrief = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
};

@Injectable()
export class AppointmentService {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly notifications: NotificationService,
  ) {}

  listHealthCentres() {
    return this.repo.listHealthCenters();
  }

  async searchDoctors(_user: JwtRequestUser, q: SearchDoctorsQueryDto) {
    const day = parseUtcDateOnly(q.date);
    if (
      q.healthCenterId &&
      !(await this.repo.healthCenterExists(q.healthCenterId))
    ) {
      throw new BadRequestException('Unknown health centre');
    }
    const profiles = await this.repo.findActiveDoctorProfilesBySpecialization(
      q.specialization,
      q.healthCenterId ? { healthCenterId: q.healthCenterId } : undefined,
    );
    const hits: Array<{
      doctorUserId: string;
      fullName: string;
      specialization: string;
      freeSlotCount: number;
    }> = [];

    for (const p of profiles) {
      const { freeCount, hasApplicableAvailability } = await this.buildSlotState(
        p.id,
        p.user.id,
        day,
        q.healthCenterId ? { healthCenterId: q.healthCenterId } : undefined,
      );
      if (q.healthCenterId && !hasApplicableAvailability) {
        continue;
      }
      hits.push({
        doctorUserId: p.user.id,
        fullName: `${p.user.firstName} ${p.user.lastName}`,
        specialization: p.specialization,
        freeSlotCount: freeCount,
      });
    }

    return hits;
  }

  async doctorBookingDetail(doctorUserId: string, query: DoctorBookingDateQueryDto) {
    const day = parseUtcDateOnly(query.date);
    const loaded = await this.repo.findDoctorUserAndProfile(doctorUserId, true);
    if (!loaded || !loaded.doctorProfile) {
      throw new NotFoundException('Doctor not found or inactive');
    }
    const dp = loaded.doctorProfile;
    const rows = await this.repo.findAvailabilitiesWithCenters(dp.id);
    let applicable = rows.filter((r) => availabilityAppliesOnUtcDay(r, day));

    if (query.healthCenterId) {
      if (!(await this.repo.healthCenterExists(query.healthCenterId))) {
        throw new BadRequestException('Unknown health centre');
      }
      applicable = applicable.filter(
        (r) => r.healthCenterId === query.healthCenterId,
      );
    }
    const { groups, centreMap, freeCount } = await this.buildGroupedSlots(
      applicable,
      loaded.id,
      day,
    );

    return {
      doctorUserId: loaded.id,
      fullName: `${loaded.firstName} ${loaded.lastName}`,
      specialization: dp.specialization,
      consultationFee: dp.consultationFee.toString(),
      doctorPhone: loaded.phone,
      freeSlotCount: freeCount,
      healthCentres: [...centreMap.values()],
      slotsByHealthCentre: groups,
    };
  }

  async book(user: JwtRequestUser, dto: BookAppointmentDto) {
    const patientId = user.id;
    const utcDay = parseUtcDateOnly(dto.date);
    const rule = await this.repo.findAvailabilityRuleBookingContext(
      dto.availabilityRuleId,
    );
    if (!rule || rule.doctor.status !== DoctorStatus.ACTIVE) {
      throw new NotFoundException('Availability rule not found or doctor inactive');
    }

    if (!availabilityAppliesOnUtcDay(rule, utcDay)) {
      throw new BadRequestException('Rule does not apply on this date');
    }

    const doctorUserId = rule.doctor.userId;
    const starts = generateSlotStartTimes(
      rule.startTime,
      rule.endTime,
      rule.slotDurationMinutes,
    );
    if (!starts.includes(dto.startTime)) {
      throw new BadRequestException('Invalid slot start time');
    }

    const booked = await this.repo.findBookedIntervals(doctorUserId, utcDay);
    const candMin = timeToMinutes(dto.startTime);
    const candDur = rule.slotDurationMinutes;
    for (const b of booked) {
      const bm = timeToMinutes(b.appointmentTime);
      if (
        intervalsOverlapMinuteRanges(candMin, candDur, bm, b.durationMinutes)
      ) {
        throw new ConflictException('That time is no longer available');
      }
    }

    try {
      const appointment = await this.repo.createAppointment({
        patientId,
        doctorId: doctorUserId,
        healthCenterId: rule.healthCenterId,
        availabilityRuleId: rule.id,
        appointmentDate: utcDay,
        appointmentTime: dto.startTime,
        durationMinutes: candDur,
        consultationFee: rule.doctor.consultationFee,
        reasonForVisit: dto.reasonForVisit,
      });

      const reminderAt = utcDay.getTime() - 24 * 60 * 60 * 1000;
      const delayMs = Math.max(0, reminderAt - Date.now());
      void this.notifications.enqueue(
        NOTIFICATION_JOB_TYPES.APPOINTMENT_REMINDER,
        {
          userId: patientId,
          recipient: user.email,
          subject: 'Appointment reminder',
          data: {
            appointmentId: appointment.id,
            date: dto.date,
            time: dto.startTime,
          },
        },
        { delayMs },
      );

      return appointment;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Duplicate booking for this slot');
      }
      throw e;
    }
  }

  async listPatient(user: JwtRequestUser, query: AppointmentListQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const [items, total] = await Promise.all([
      this.repo.listPatientAppointments(user.id, { skip, take }),
      this.repo.countPatientAppointments(user.id),
    ]);
    return { items, total, skip, take };
  }

  async doctorSchedule(user: JwtRequestUser, q: DoctorScheduleQueryDto) {
    const from = q.from
      ? parseUtcDateOnly(q.from)
      : parseUtcDateOnly(formatUtcDateYmd(new Date()));

    let endExclusive: Date;
    if (q.toInclusive) {
      const toDay = parseUtcDateOnly(q.toInclusive);
      if (toDay.getTime() < from.getTime()) {
        throw new BadRequestException('toInclusive must be on or after from');
      }
      endExclusive = addUtcCalendarDays(toDay, 1);
    } else {
      endExclusive = addUtcCalendarDays(
        from,
        APPOINTMENT_DOCTOR_SCHEDULE_INCLUSIVE_DAY_TAIL + 1,
      );
    }

    if (endExclusive.getTime() <= from.getTime()) {
      throw new BadRequestException('Invalid date range');
    }

    if (
      q.healthCenterId &&
      !(await this.repo.healthCenterExists(q.healthCenterId))
    ) {
      throw new BadRequestException('Unknown health centre');
    }

    return this.repo.listDoctorAppointmentsInRange(
      user.id,
      from,
      endExclusive,
      q.healthCenterId ? { healthCenterId: q.healthCenterId } : undefined,
    );
  }

  async listDoctorAvailability(user: JwtRequestUser) {
    const p = await this.repo.findDoctorProfileOnly(user.id);
    if (!p) {
      throw new NotFoundException('Doctor profile not registered');
    }
    return this.repo.findAvailabilitiesWithCenters(p.id);
  }

  async createDoctorAvailability(userId: string, dto: CreateAvailabilityDto) {
    await this.validateAvailabilityDtoShape(dto);
    const profile = await this.requireDoctorProfile(userId);
    if (!(await this.repo.healthCenterExists(dto.healthCenterId))) {
      throw new BadRequestException('Unknown health centre');
    }
    const candidate = this.toAvailPatch(dto);
    await this.assertNoOverlap(profile.id, candidate);
    return this.repo.createAvailabilityRow({
      doctorId: profile.id,
      healthCenterId: candidate.healthCenterId,
      dayOfWeek: candidate.dayOfWeek,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      slotDurationMinutes: candidate.slotDurationMinutes,
      isRecurring: candidate.isRecurring,
      specificDate: candidate.specificDate,
    });
  }

  async updateDoctorAvailability(
    userId: string,
    availabilityId: string,
    dto: UpdateAvailabilityDto,
  ) {
    const profile = await this.requireDoctorProfile(userId);
    const existing = await this.repo.findAvailabilityOwnership(
      availabilityId,
      profile.id,
    );
    if (!existing) {
      throw new NotFoundException('Availability not found');
    }
    const merged = this.mergeAvailability(existing, dto);
    await this.validateAvailabilityMerged(merged);

    const healthCenterId = merged.healthCenterId ?? existing.healthCenterId;
    if (
      merged.healthCenterId &&
      merged.healthCenterId !== existing.healthCenterId &&
      !(await this.repo.healthCenterExists(merged.healthCenterId))
    ) {
      throw new BadRequestException('Unknown health centre');
    }

    await this.assertNoOverlap(profile.id, {
      id: existing.id,
      healthCenterId: healthCenterId,
      dayOfWeek: merged.dayOfWeek,
      startTime: merged.startTime,
      endTime: merged.endTime,
      slotDurationMinutes: merged.slotDurationMinutes,
      isRecurring: merged.isRecurring,
      specificDate: merged.specificDate,
    });

    const patch: Prisma.DoctorAvailabilityUncheckedUpdateInput = {
      healthCenterId: merged.healthCenterId ?? existing.healthCenterId,
      dayOfWeek: merged.dayOfWeek,
      startTime: merged.startTime,
      endTime: merged.endTime,
      slotDurationMinutes: merged.slotDurationMinutes,
      isRecurring: merged.isRecurring,
      specificDate: merged.specificDate,
    };

    return this.repo.updateAvailabilityRow(existing.id, patch);
  }

  async deleteDoctorAvailability(userId: string, availabilityId: string) {
    const profile = await this.requireDoctorProfile(userId);
    const res = await this.repo.deleteAvailability(availabilityId, profile.id);
    if (!res.count) {
      throw new NotFoundException('Availability not found');
    }
    return { deleted: true };
  }

  async cancelAppointment(
    appointmentId: string,
    user: JwtRequestUser,
    dto: CancelAppointmentDto,
  ) {
    const appt = await this.requireAppointmentAccess(appointmentId, user);
    if (
      appt.status === AppointmentStatus.CANCELLED ||
      appt.status === AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException('Appointment cannot be cancelled');
    }
    return this.repo.updateAppointmentStatus(
      appointmentId,
      AppointmentStatus.CANCELLED,
      {
        cancelledAt: new Date(),
        notes: dto.reason ?? appt.notes ?? undefined,
      },
    );
  }

  async startAppointment(appointmentId: string, user: JwtRequestUser) {
    await this.requireDoctorOrAdmin(appointmentId, user);
    const appt = await this.repo.findAppointmentById(appointmentId);
    if (!appt || appt.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled appointments can be started');
    }
    return this.repo.updateAppointmentStatus(
      appointmentId,
      AppointmentStatus.IN_PROGRESS,
    );
  }

  async completeAppointment(appointmentId: string, user: JwtRequestUser) {
    await this.requireDoctorOrAdmin(appointmentId, user);
    const appt = await this.repo.findAppointmentById(appointmentId);
    if (
      !appt ||
      (appt.status !== AppointmentStatus.SCHEDULED &&
        appt.status !== AppointmentStatus.IN_PROGRESS)
    ) {
      throw new BadRequestException('Appointment cannot be completed');
    }
    return this.repo.updateAppointmentStatus(
      appointmentId,
      AppointmentStatus.COMPLETED,
    );
  }

  async upsertVisitNote(
    appointmentId: string,
    user: JwtRequestUser,
    dto: CreateVisitNoteDto,
  ) {
    const appt = await this.requireDoctorOrAdmin(appointmentId, user);
    if (appt.doctorId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the assigned doctor can add visit notes');
    }
    return this.repo.upsertVisitNote(appointmentId, dto);
  }

  async getVisitNote(appointmentId: string, user: JwtRequestUser) {
    await this.requireAppointmentAccess(appointmentId, user);
    const note = await this.repo.findVisitNote(appointmentId);
    if (!note) {
      throw new NotFoundException('Visit note not found');
    }
    return note;
  }

  async createPrescription(
    appointmentId: string,
    user: JwtRequestUser,
    dto: CreatePrescriptionDto,
  ) {
    const appt = await this.requireDoctorOrAdmin(appointmentId, user);
    if (appt.doctorId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the assigned doctor can prescribe');
    }
    const existing = await this.repo.findPrescriptionByAppointment(appointmentId);
    if (existing) {
      throw new ConflictException('Prescription already exists for this appointment');
    }
    return this.repo.createPrescription({
      appointmentId,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      medicines: dto.medicines,
      notes: dto.notes,
      issuedAt: new Date(),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
    });
  }

  async getPrescription(appointmentId: string, user: JwtRequestUser) {
    await this.requireAppointmentAccess(appointmentId, user);
    const rx = await this.repo.findPrescriptionByAppointment(appointmentId);
    if (!rx) {
      throw new NotFoundException('Prescription not found');
    }
    return rx;
  }

  async listMyPrescriptions(user: JwtRequestUser, query: PrescriptionListQueryDto) {
    if (user.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Patients only');
    }
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const [items, total] = await this.repo.listPatientPrescriptions(
      user.id,
      skip,
      take,
    );
    return { items, total, skip, take };
  }

  private async requireAppointmentAccess(
    appointmentId: string,
    user: JwtRequestUser,
  ) {
    const appt = await this.repo.findAppointmentById(appointmentId);
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }
    const isPatient = appt.patientId === user.id;
    const isDoctor = appt.doctorId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isPatient && !isDoctor && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }
    return appt;
  }

  private async requireDoctorOrAdmin(
    appointmentId: string,
    user: JwtRequestUser,
  ) {
    const appt = await this.repo.findAppointmentById(appointmentId);
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }
    if (user.role === UserRole.ADMIN) {
      return appt;
    }
    if (user.role !== UserRole.DOCTOR || appt.doctorId !== user.id) {
      throw new ForbiddenException('Doctor access required');
    }
    return appt;
  }

  private async validateAvailabilityDtoShape(dto: CreateAvailabilityDto) {
    if (dto.isRecurring && !dto.dayOfWeek) {
      throw new BadRequestException('Recurring rules require dayOfWeek');
    }
    if (!dto.isRecurring && !dto.specificDate) {
      throw new BadRequestException('One-off rules require specificDate');
    }
    if (timeToMinutes(dto.startTime) >= timeToMinutes(dto.endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }

  private async validateAvailabilityMerged(merged: {
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    dayOfWeek: DoctorAvailability['dayOfWeek'];
    specificDate: Date | null;
  }) {
    if (merged.isRecurring && !merged.dayOfWeek) {
      throw new BadRequestException('Recurring rules require dayOfWeek');
    }
    if (!merged.isRecurring && !merged.specificDate) {
      throw new BadRequestException('One-off rules require specificDate');
    }
    if (timeToMinutes(merged.startTime) >= timeToMinutes(merged.endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }

  private toAvailPatch(dto: CreateAvailabilityDto): {
    healthCenterId: string;
    dayOfWeek: DoctorAvailability['dayOfWeek'];
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    isRecurring: boolean;
    specificDate: Date | null;
  } {
    return {
      healthCenterId: dto.healthCenterId,
      dayOfWeek: dto.isRecurring ? dto.dayOfWeek! : null,
      startTime: dto.startTime,
      endTime: dto.endTime,
      slotDurationMinutes: dto.slotDurationMinutes,
      isRecurring: dto.isRecurring,
      specificDate:
        !dto.isRecurring && dto.specificDate
          ? parseUtcDateOnly(dto.specificDate.slice(0, 10))
          : null,
    };
  }

  private mergeAvailability(
    existing: DoctorAvailability & { healthCenter: HealthCenter },
    dto: UpdateAvailabilityDto,
  ): {
    healthCenterId?: string;
    dayOfWeek: DoctorAvailability['dayOfWeek'];
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    isRecurring: boolean;
    specificDate: Date | null;
  } {
    const isRecurring = dto.isRecurring ?? existing.isRecurring;
    let dayOfWeek = existing.dayOfWeek;
    let specificDate = existing.specificDate;

    if (dto.dayOfWeek !== undefined) {
      dayOfWeek = dto.dayOfWeek;
    }
    if (dto.specificDate !== undefined) {
      specificDate = dto.specificDate
        ? parseUtcDateOnly(dto.specificDate.slice(0, 10))
        : null;
    }
    if (dto.isRecurring === true) {
      specificDate = null;
    }
    if (dto.isRecurring === false && dto.specificDate === undefined) {
      specificDate = existing.specificDate;
    }
    if (!isRecurring && !specificDate) {
      throw new BadRequestException('One-off rules require specificDate');
    }
    if (isRecurring && !dayOfWeek) {
      throw new BadRequestException('Recurring rules require dayOfWeek');
    }

    return {
      healthCenterId: dto.healthCenterId,
      dayOfWeek: isRecurring ? dayOfWeek : null,
      startTime: dto.startTime ?? existing.startTime,
      endTime: dto.endTime ?? existing.endTime,
      slotDurationMinutes:
        dto.slotDurationMinutes ?? existing.slotDurationMinutes,
      isRecurring,
      specificDate: isRecurring ? null : specificDate,
    };
  }

  private async assertNoOverlap(
    doctorProfileId: string,
    candidate: {
      id?: string;
      healthCenterId: string;
      dayOfWeek: DoctorAvailability['dayOfWeek'];
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
      isRecurring: boolean;
      specificDate: Date | null;
    },
  ) {
    const siblings = await this.repo.loadDoctorAvailabilitiesForOverlap(
      doctorProfileId,
    );
    for (const row of siblings) {
      if (row.id === candidate.id) {
        continue;
      }
      if (
        availabilitiesOverlap(row, {
          healthCenterId: candidate.healthCenterId,
          dayOfWeek: candidate.dayOfWeek,
          specificDate: candidate.specificDate,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          isRecurring: candidate.isRecurring,
        })
      ) {
        throw new ConflictException(
          'Availability overlaps an existing window at this centre',
        );
      }
    }
  }

  private async requireDoctorProfile(userId: string) {
    const p = await this.repo.findDoctorProfileOnly(userId);
    if (!p) {
      throw new NotFoundException('Doctor profile not found');
    }
    return p;
  }

  private mapHealthCenter(
    h: Pick<
      HealthCenter,
      'id' | 'name' | 'address' | 'city' | 'state' | 'zipCode' | 'phone' | 'email'
    >,
  ): HealthCentreBrief {
    return {
      id: h.id,
      name: h.name,
      address: h.address,
      city: h.city,
      state: h.state,
      zipCode: h.zipCode,
      phone: h.phone,
      email: h.email,
    };
  }

  private async buildSlotState(
    doctorProfileId: string,
    doctorUserId: string,
    utcDay: Date,
    filters?: { healthCenterId?: string },
  ) {
    const rows = await this.repo.findAvailabilitiesWithCenters(doctorProfileId);
    let applicable = rows.filter((r) => availabilityAppliesOnUtcDay(r, utcDay));
    if (filters?.healthCenterId) {
      applicable = applicable.filter(
        (r) => r.healthCenterId === filters.healthCenterId,
      );
    }
    if (applicable.length === 0) {
      return { freeCount: 0, hasApplicableAvailability: false };
    }
    const { freeCount } = await this.buildGroupedSlots(
      applicable,
      doctorUserId,
      utcDay,
    );
    return { freeCount, hasApplicableAvailability: true };
  }

  private async buildGroupedSlots(
    applicableRows: Array<DoctorAvailability & { healthCenter: HealthCenter }>,
    doctorUserId: string,
    utcDay: Date,
  ): Promise<{
    groups: AppointmentSlotGroupDto[];
    centreMap: Map<string, HealthCentreBrief>;
    freeCount: number;
  }> {
    const booked = await this.repo.findBookedIntervals(doctorUserId, utcDay);
    const centreMap = new Map<string, HealthCentreBrief>();
    for (const r of applicableRows) {
      centreMap.set(r.healthCenterId, this.mapHealthCenter(r.healthCenter));
    }
    const grouped = new Map<string, AppointmentSlotGroupDto>();
    let freeCount = 0;

    for (const row of applicableRows) {
      const hcId = row.healthCenterId;
      if (!grouped.has(hcId)) {
        grouped.set(hcId, {
          healthCenter: this.mapHealthCenter(row.healthCenter),
          slots: [],
        });
      }
      const bucket = grouped.get(hcId)!;
      const starts = generateSlotStartTimes(
        row.startTime,
        row.endTime,
        row.slotDurationMinutes,
      );
      for (const st of starts) {
        const sm = timeToMinutes(st);
        const taken = booked.some((b) =>
          intervalsOverlapMinuteRanges(
            sm,
            row.slotDurationMinutes,
            timeToMinutes(b.appointmentTime),
            b.durationMinutes,
          ),
        );
        const slot: AppointmentSlotDto = {
          availabilityRuleId: row.id,
          healthCenterId: hcId,
          startTime: st,
          durationMinutes: row.slotDurationMinutes,
          available: !taken,
        };
        bucket.slots.push(slot);
        if (!taken) {
          freeCount += 1;
        }
      }
    }

    return {
      groups: [...grouped.values()],
      centreMap,
      freeCount,
    };
  }
}
