import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  DoctorStatus,
  Prisma,
  TelehealthPresence,
  TelehealthStatus,
  UserRole,
} from '@prisma/client';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { RedisKeyService } from '../../common/redis/redis-key.service';
import { safeRedisClose } from '../../common/redis/safe-redis-close';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { NOTIFICATION_JOB_TYPES } from '../notification/constants/notification.constants';
import { NotificationService } from '../notification/notification.service';
import {
  TELEHEALTH_IDEMPOTENCY_TTL_S,
  TELEHEALTH_JOIN_TOKEN_TTL_S,
  TELEHEALTH_MAX_OFFERS,
  TELEHEALTH_OFFER_TTL_MS,
  TELEHEALTH_PRESENCE_TTL_S,
  TELEHEALTH_SEARCH_RETRY_MS,
  TELEHEALTH_SEARCH_WINDOW_MS,
  TELEHEALTH_TERMINAL_STATUSES,
  TELEHEALTH_TRANSITIONS,
  TELEHEALTH_VIDEO_PROVIDER,
} from './constants/telehealth.constants';
import {
  AdminTelehealthQueryDto,
  CancelTelehealthDto,
  CreateTelehealthRequestDto,
  PatientTelehealthQueryDto,
  SetPresenceDto,
} from './dto/telehealth-request.dto';
import { TelehealthRepository } from './repositories/telehealth.repository';
import type { TelehealthVideoProvider } from './providers/telehealth-video-provider.interface';
import type {
  DoctorPresenceView,
  EffectiveAvailability,
  TelehealthRequestView,
} from './types/telehealth.types';

const RECONCILE_QUEUE = 'telehealth-reconcile';

function parseRedisConnection(): { host: string; port: number; password?: string } | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? Number(parsed.port) : 6379,
      password: parsed.password || undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

@Injectable()
export class TelehealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelehealthService.name);
  private readonly redis: Redis | null;
  private reconcileQueue: Queue | null = null;

  constructor(
    private readonly repo: TelehealthRepository,
    private readonly redisKey: RedisKeyService,
    private readonly notifications: NotificationService,
    @Inject(TELEHEALTH_VIDEO_PROVIDER)
    private readonly video: TelehealthVideoProvider,
  ) {
    const redisUrl = process.env.REDIS_URL;
    this.redis =
      redisUrl
        ? new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          })
        : null;
  }

  onModuleInit() {
    const connection = parseRedisConnection();
    if (!connection) return;
    this.reconcileQueue = new Queue(RECONCILE_QUEUE, { connection });
  }

  async onModuleDestroy() {
    try {
      await this.reconcileQueue?.close();
    } catch {
      /* ignore queue teardown errors */
    }
    await safeRedisClose(this.redis);
  }

  // ─── Patient ─────────────────────────────────────────────────────────────

  async createRequest(
    patient: JwtRequestUser,
    dto: CreateTelehealthRequestDto,
    idempotencyKey?: string,
  ) {
    if (patient.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Patients only');
    }

    if (idempotencyKey && this.redis) {
      const cached = await this.redisGet(
        this.redisKey.telehealthIdempotency(idempotencyKey),
      );
      if (cached) return JSON.parse(cached) as TelehealthRequestView;
    }

    const searchExpiresAt = new Date(Date.now() + TELEHEALTH_SEARCH_WINDOW_MS);
    const defaultFee = new Prisma.Decimal(process.env.TELEHEALTH_DEFAULT_FEE ?? '500');

    const row = await this.repo.createRequest({
      patientId: patient.id,
      consultationFee: defaultFee,
      searchExpiresAt,
      reasonForVisit: dto.reasonForVisit,
      emergencyType: dto.emergencyType,
      notes: dto.notes,
      queuePriority: dto.queuePriority,
    });

    const offered = await this.tryOfferOrQueue(row.id);
    const result = this.mapRequest(offered ?? row);

    if (idempotencyKey && this.redis) {
      await this.redisSetex(
        this.redisKey.telehealthIdempotency(idempotencyKey),
        TELEHEALTH_IDEMPOTENCY_TTL_S,
        JSON.stringify(result),
      );
    }

    return result;
  }

  async listMyRequests(patient: JwtRequestUser, query: PatientTelehealthQueryDto) {
    if (patient.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Patients only');
    }
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const [items, total] = await this.repo.listPatientRequests(patient.id, skip, take);
    return { items: items.map((r) => this.mapRequest(r)), total, skip, take };
  }

  async getRequest(id: string, user: JwtRequestUser) {
    await this.reconcile();
    const row = await this.requireRequest(id);
    this.requireParticipant(row, user);
    return this.mapRequest(row);
  }

  async cancelRequest(id: string, user: JwtRequestUser, dto: CancelTelehealthDto) {
    const row = await this.requireRequest(id);
    this.requireParticipant(row, user);
    if (row.status !== TelehealthStatus.REQUESTED && row.status !== TelehealthStatus.ACCEPTED) {
      throw new BadRequestException('Cannot cancel in current status');
    }
    const updated = await this.repo.cancelRequest(id);
    if (!updated) throw new NotFoundException('Request not found');
    void this.drainQueue();
    return this.mapRequest(updated);
  }

  async joinCall(id: string, user: JwtRequestUser) {
    const row = await this.requireRequest(id);
    this.requireParticipant(row, user);

    const allowed: TelehealthStatus[] = [
      TelehealthStatus.ACCEPTED,
      TelehealthStatus.DOCTOR_JOINED,
      TelehealthStatus.PATIENT_JOINED,
      TelehealthStatus.ACTIVE,
    ];
    if (!allowed.includes(row.status)) {
      throw new BadRequestException('Session not ready to join');
    }

    let session = row.session;
    if (!session) {
      const room = await this.video.createRoom(id);
      session = await this.repo.createSession(id, room.roomId, room.roomHandle);
    }

    const role = user.id === row.patientId ? 'patient' : 'doctor';
    const tokenResult = await this.video.mintJoinToken({
      roomId: session.videoRoomId,
      userId: user.id,
      role,
      ttlSeconds: TELEHEALTH_JOIN_TOKEN_TTL_S,
    });

    if (user.id === row.doctorId && row.status === TelehealthStatus.ACCEPTED) {
      await this.repo.updateStatus(id, TelehealthStatus.DOCTOR_JOINED);
    } else if (user.id === row.patientId && row.status === TelehealthStatus.DOCTOR_JOINED) {
      await this.repo.updateStatus(id, TelehealthStatus.PATIENT_JOINED, {
        startedAt: new Date(),
      });
    } else if (
      row.status === TelehealthStatus.PATIENT_JOINED ||
      row.status === TelehealthStatus.DOCTOR_JOINED
    ) {
      await this.repo.updateStatus(id, TelehealthStatus.ACTIVE, {
        startedAt: row.startedAt ?? new Date(),
      });
    }

    return {
      token: tokenResult.token,
      roomId: session.videoRoomId,
      expiresAt: tokenResult.expiresAt.toISOString(),
    };
  }

  // ─── Doctor ──────────────────────────────────────────────────────────────

  async setPresence(doctor: JwtRequestUser, dto: SetPresenceDto) {
    this.requireDoctor(doctor);
    const profile = await this.repo.findDoctorProfileByUserId(doctor.id);
    if (!profile) throw new BadRequestException('Doctor profile not found');
    if (!profile.isProvideTeleHealth) {
      throw new BadRequestException('Telehealth not enabled for this doctor');
    }
    if (profile.status !== DoctorStatus.ACTIVE) {
      throw new BadRequestException('Doctor account is not active');
    }

    const now = new Date();
    let onlineUntil: Date | null = null;
    if (dto.presence === TelehealthPresence.ONLINE) {
      onlineUntil = new Date(now.getTime() + TELEHEALTH_PRESENCE_TTL_S * 1000);
    } else if (dto.presence === TelehealthPresence.BUSY) {
      onlineUntil = new Date(now.getTime() + TELEHEALTH_PRESENCE_TTL_S * 1000);
    }

    await this.repo.updatePresence(doctor.id, dto.presence, onlineUntil);

    if (
      (dto.presence === TelehealthPresence.BUSY ||
        dto.presence === TelehealthPresence.OFFLINE) &&
      profile.activeTelehealthId
    ) {
      await this.declineOffer(profile.activeTelehealthId, doctor, true);
    }

    if (dto.presence === TelehealthPresence.ONLINE) {
      void this.drainQueue();
    }

    return this.getPresence(doctor);
  }

  async getPresence(doctor: JwtRequestUser): Promise<DoctorPresenceView> {
    this.requireDoctor(doctor);
    const profile = await this.repo.findDoctorProfileByUserId(doctor.id);
    if (!profile) throw new BadRequestException('Doctor profile not found');

    const pendingOffers = await this.repo.countPendingOffers(doctor.id);
    return {
      presence: profile.telehealthPresence,
      effectiveAvailability: this.effectiveAvailability(profile),
      onlineUntil: profile.telehealthOnlineUntil?.toISOString() ?? null,
      isProvideTeleHealth: profile.isProvideTeleHealth,
      pendingOffers,
    };
  }

  async doctorInbox(doctor: JwtRequestUser) {
    this.requireDoctor(doctor);
    await this.reconcile();
    const items = await this.repo.listDoctorInbox(doctor.id);
    return items.map((r) => this.mapRequest(r));
  }

  async acceptOffer(id: string, doctor: JwtRequestUser) {
    this.requireDoctor(doctor);
    const updated = await this.repo.acceptOffer(id, doctor.id);
    if (!updated) {
      throw new ConflictException('This request is no longer available');
    }

    const room = await this.video.createRoom(id);
    await this.repo.createSession(id, room.roomId, room.roomHandle);

    void this.notifications.safeEnqueue(NOTIFICATION_JOB_TYPES.TELEHEALTH_ACCEPTED, {
      userId: updated.patientId,
      recipient: updated.patient.email,
      subject: 'Doctor accepted your telehealth request',
      data: {
        telehealthId: id,
        doctorName: `${updated.doctor?.firstName ?? ''} ${updated.doctor?.lastName ?? ''}`.trim(),
      },
    });

    return this.mapRequest(updated);
  }

  async declineOffer(id: string, doctor: JwtRequestUser, internal = false) {
    this.requireDoctor(doctor);
    const row = await this.requireRequest(id);
    if (row.doctorId !== doctor.id) {
      throw new ForbiddenException('Not assigned to this request');
    }

    const attempted = [...row.attemptedDoctorIds, doctor.id];
    await this.repo.releaseDoctorClaim(doctor.id, id);
    await this.repo.queueRequest(id, attempted);

    if (!internal) {
      void this.tryOfferOrQueue(id);
    } else {
      void this.tryOfferOrQueue(id);
    }

    const refreshed = await this.requireRequest(id);
    return this.mapRequest(refreshed);
  }

  async completeSession(id: string, doctor: JwtRequestUser) {
    this.requireDoctor(doctor);
    const row = await this.requireRequest(id);
    if (row.doctorId !== doctor.id) {
      throw new ForbiddenException('Not assigned to this request');
    }
    this.assertTransition(row.status, TelehealthStatus.COMPLETED);

    const updated = await this.repo.completeWithPayment(
      id,
      row.patientId,
      row.consultationFee,
    );
    if (!updated) throw new NotFoundException('Request not found');

    void this.notifications.safeEnqueue(NOTIFICATION_JOB_TYPES.TELEHEALTH_COMPLETED, {
      userId: row.patientId,
      recipient: row.patient.email,
      subject: 'Telehealth session completed',
      data: { telehealthId: id },
    });

    void this.drainQueue();
    return this.mapRequest(updated);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────

  async adminList(query: AdminTelehealthQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const [items, total] = await this.repo.listAdmin({
      status: query.status as TelehealthStatus | undefined,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      skip,
      take,
    });
    return { items: items.map((r) => this.mapRequest(r)), total, skip, take };
  }

  // ─── Ring / queue internals ──────────────────────────────────────────────

  private async tryOfferOrQueue(telehealthId: string) {
    await this.reconcileClaims();
    const row = await this.requireRequest(telehealthId);

    if (row.status !== TelehealthStatus.REQUESTED) return row;
    if (row.searchExpiresAt && row.searchExpiresAt <= new Date()) {
      return this.repo.markMissed(telehealthId);
    }
    if (row.offerAttempts >= TELEHEALTH_MAX_OFFERS) {
      return this.repo.markMissed(telehealthId);
    }

    const candidates = await this.repo.findEligibleCandidates(
      row.attemptedDoctorIds,
      new Date(),
    );
    if (candidates.length === 0) {
      if (row.doctorId) {
        return this.repo.queueRequest(telehealthId, row.attemptedDoctorIds);
      }
      this.scheduleReconcile();
      return row;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
    const offerExpiresAt = new Date(Date.now() + TELEHEALTH_OFFER_TTL_MS);
    const attempted = row.doctorId && !row.attemptedDoctorIds.includes(row.doctorId)
      ? [...row.attemptedDoctorIds, row.doctorId]
      : row.attemptedDoctorIds;

    const offered = await this.repo.claimDoctorAndOffer(
      telehealthId,
      pick.userId,
      offerExpiresAt,
      pick.consultationFee,
      attempted,
    );

    if (!offered) {
      return this.tryOfferOrQueue(telehealthId);
    }

    void this.notifications.safeEnqueue(NOTIFICATION_JOB_TYPES.TELEHEALTH_OFFER, {
      userId: pick.userId,
      recipient: pick.user.email,
      subject: 'New telehealth request',
      data: {
        telehealthId,
        patientName: `${row.patient.firstName} ${row.patient.lastName}`,
      },
    });

    this.scheduleReconcile();
    return offered;
  }

  private async drainQueue() {
    await this.reconcileClaims();
    const waiting = await this.repo.findWaitingQueue(new Date(), 5);
    for (const w of waiting) {
      await this.tryOfferOrQueue(w.id);
    }
  }

  private async reconcile() {
    await this.reconcileClaims();
    const now = new Date();

    const expiredOffers = await this.repo.findExpiredOffers(now);
    for (const row of expiredOffers) {
      if (row.doctorId) {
        const attempted = row.attemptedDoctorIds.includes(row.doctorId)
          ? row.attemptedDoctorIds
          : [...row.attemptedDoctorIds, row.doctorId];
        await this.repo.releaseDoctorClaim(row.doctorId, row.id);
        await this.repo.queueRequest(row.id, attempted);
      }
      await this.tryOfferOrQueue(row.id);
    }

    const expiredSearches = await this.repo.findExpiredSearches(now);
    for (const row of expiredSearches) {
      if (row.status === TelehealthStatus.REQUESTED && !row.acceptedAt) {
        const missed = await this.repo.markMissed(row.id);
        if (missed) {
          void this.notifications.safeEnqueue(NOTIFICATION_JOB_TYPES.TELEHEALTH_MISSED, {
            userId: missed.patientId,
            recipient: missed.patient.email,
            subject: 'No doctor available for telehealth',
            data: { telehealthId: row.id },
          });
        }
      }
    }

    await this.drainQueue();
  }

  private async reconcileClaims() {
    const stale = await this.repo.findStaleClaims();
    for (const doc of stale) {
      if (!doc.activeTelehealthId) continue;
      const appt = await this.repo.findById(doc.activeTelehealthId);
      if (!appt) {
        await this.repo.clearDoctorClaimByTelehealthId(doc.activeTelehealthId);
        continue;
      }
      const terminal = TELEHEALTH_TERMINAL_STATUSES.includes(appt.status);
      const offerExpired =
        appt.status === TelehealthStatus.REQUESTED &&
        appt.offerExpiresAt !== null &&
        appt.offerExpiresAt < new Date();
      if (terminal || offerExpired) {
        await this.repo.clearDoctorClaimByTelehealthId(doc.activeTelehealthId);
      }
    }
  }

  private scheduleReconcile() {
    if (!this.reconcileQueue) return;
    void this.reconcileQueue
      .add('reconcile', {}, { delay: TELEHEALTH_SEARCH_RETRY_MS, removeOnComplete: 50 })
      .catch((err: Error) =>
        this.logger.warn(`Failed to schedule reconcile: ${err.message}`),
      );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async requireRequest(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException('Telehealth request not found');
    return row;
  }

  private requireParticipant(
    row: Awaited<ReturnType<TelehealthRepository['findById']>> & object,
    user: JwtRequestUser,
  ) {
    if (user.role === UserRole.ADMIN) return;
    if (row.patientId !== user.id && row.doctorId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
  }

  private requireDoctor(user: JwtRequestUser) {
    if (user.role !== UserRole.DOCTOR) {
      throw new ForbiddenException('Doctors only');
    }
  }

  private assertTransition(current: TelehealthStatus, next: TelehealthStatus) {
    const allowed = TELEHEALTH_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${next}`);
    }
  }

  private effectiveAvailability(profile: {
    telehealthPresence: TelehealthPresence;
    telehealthOnlineUntil: Date | null;
    activeTelehealthId: string | null;
    isProvideTeleHealth: boolean;
  }): EffectiveAvailability {
    if (!profile.isProvideTeleHealth) return 'OFFLINE';
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

  private mapRequest(
    row: NonNullable<Awaited<ReturnType<TelehealthRepository['findById']>>>,
  ): TelehealthRequestView {
    return {
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      status: row.status,
      queuePriority: row.queuePriority,
      offerExpiresAt: row.offerExpiresAt?.toISOString() ?? null,
      searchExpiresAt: row.searchExpiresAt?.toISOString() ?? null,
      offerAttempts: row.offerAttempts,
      emergencyType: row.emergencyType,
      reasonForVisit: row.reasonForVisit,
      notes: row.notes,
      consultationFee: row.consultationFee.toString(),
      requestedAt: row.requestedAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      startedAt: row.startedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      waitingForDoctor: row.status === TelehealthStatus.REQUESTED && row.doctorId === null,
      patient: {
        id: row.patient.id,
        firstName: row.patient.firstName,
        lastName: row.patient.lastName,
        phone: row.patient.phone,
      },
      doctor: row.doctor
        ? {
            id: row.doctor.id,
            firstName: row.doctor.firstName,
            lastName: row.doctor.lastName,
            specialization: row.doctor.doctorProfile?.specialization,
          }
        : null,
    };
  }

  private async redisGet(key: string): Promise<string | null> {
    try {
      return (await this.redis?.get(key)) ?? null;
    } catch (err) {
      this.logger.warn(`Redis GET failed: ${String(err)}`);
      return null;
    }
  }

  private async redisSetex(key: string, ttl: number, value: string): Promise<void> {
    try {
      await this.redis?.setex(key, ttl, value);
    } catch (err) {
      this.logger.warn(`Redis SETEX failed: ${String(err)}`);
    }
  }
}
