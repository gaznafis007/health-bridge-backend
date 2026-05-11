import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  AmbulanceBookingStatus,
  AmbulanceStatus,
  DriverStatus,
  PaymentEntityType,
  PaymentGateway,
  PaymentMethodType,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import Redis from 'ioredis';

import { PrismaService } from '../../database/prisma.service';
import { RedisKeyService } from '../../common/redis/redis-key.service';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { AmbulanceRepository } from './repositories/ambulance.repository';
import {
  BookingListQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  CreateHealthCenterDto,
  FleetQueryDto,
  ManualDispatchDto,
  PushLocationDto,
  RegisterAmbulanceDto,
  RegisterDriverDto,
  StartShiftDto,
  UpdateAmbulanceStatusDto,
  UpdateDriverStatusDto,
} from './dto/ambulance-request.dto';
import type { LiveLocationPayload } from './types/ambulance.types';
import {
  AMBULANCE_IDEMPOTENCY_TTL_S,
  AMBULANCE_LOCATION_TTL_S,
  BOOKING_TRANSITIONS,
  FARE_BASE_BDT,
  FARE_PER_KM_BDT,
  TERMINAL_STATUSES,
} from './constants/ambulance.constants';

@Injectable()
export class AmbulanceService implements OnModuleDestroy {
  private readonly logger = new Logger(AmbulanceService.name);
  private readonly redis: Redis | null;

  constructor(
    private readonly repo: AmbulanceRepository,
    private readonly prisma: PrismaService,
    private readonly redisKey: RedisKeyService,
  ) {
    const redisUrl = process.env.REDIS_URL;
    this.redis = redisUrl
      ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false })
      : null;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  private async redisGet(key: string): Promise<string | null> {
    try {
      return (await this.redis?.get(key)) ?? null;
    } catch (err) {
      this.logger.warn(`Redis GET failed for key ${key}: ${String(err)}`);
      return null;
    }
  }

  private async redisSetex(key: string, ttl: number, value: string): Promise<void> {
    try {
      await this.redis?.setex(key, ttl, value);
    } catch (err) {
      this.logger.warn(`Redis SETEX failed for key ${key}: ${String(err)}`);
    }
  }

  // ─── Health Centers ──────────────────────────────────────────────────────

  listHealthCenters() {
    return this.repo.listHealthCenters();
  }

  async createHealthCenter(dto: CreateHealthCenterDto) {
    return this.repo.createHealthCenter({
      name:      dto.name,
      address:   dto.address,
      city:      dto.city,
      state:     dto.state,
      zipCode:   dto.zipCode,
      phone:     dto.phone,
      email:     dto.email,
      latitude:  dto.latitude,
      longitude: dto.longitude,
      type:      dto.type,
    });
  }

  // ─── Fleet Management (Admin) ────────────────────────────────────────────

  listFleet(query: FleetQueryDto) {
    return this.repo.listAmbulances({
      healthCenterId: query.healthCenterId,
      status:         query.status,
    });
  }

  async registerAmbulance(dto: RegisterAmbulanceDto) {
    const center = await this.repo.findHealthCenterById(dto.healthCenterId);
    if (!center) {
      throw new NotFoundException('Health center not found');
    }
    return this.repo.createAmbulance({
      healthCenterId: dto.healthCenterId,
      vehicleNumber:  dto.vehicleNumber,
      vehicleType:    dto.vehicleType,
      insuranceNumber: dto.insuranceNumber,
    });
  }

  async updateAmbulanceStatus(id: string, dto: UpdateAmbulanceStatusDto) {
    const amb = await this.repo.findAmbulanceById(id);
    if (!amb) throw new NotFoundException('Ambulance not found');

    const updated = await this.repo.updateAmbulanceStatus(id, dto.status, amb.version);
    if (updated.count === 0) {
      throw new ConflictException(
        'Ambulance status was modified concurrently; please retry.',
      );
    }
    return this.repo.findAmbulanceById(id);
  }

  // ─── Driver Management (Admin) ───────────────────────────────────────────

  listDrivers(query: { healthCenterId?: string; status?: DriverStatus }) {
    return this.repo.listDrivers(query);
  }

  async registerDriver(dto: RegisterDriverDto) {
    const center = await this.repo.findHealthCenterById(dto.healthCenterId);
    if (!center) throw new NotFoundException('Health center not found');

    const existing = await this.repo.findDriverByUserId(dto.userId);
    if (existing) {
      throw new ConflictException('Driver profile already exists for this user');
    }

    return this.repo.createDriver({
      userId:           dto.userId,
      healthCenterId:   dto.healthCenterId,
      licenseNumber:    dto.licenseNumber,
      licenseExpiryDate: new Date(dto.licenseExpiryDate),
    });
  }

  async updateDriverStatus(id: string, dto: UpdateDriverStatusDto) {
    const driver = await this.repo.findDriverById(id);
    if (!driver) throw new NotFoundException('Driver not found');
    return this.repo.updateDriverStatus(id, dto.status);
  }

  async verifyDriver(id: string) {
    const driver = await this.repo.findDriverById(id);
    if (!driver) throw new NotFoundException('Driver not found');
    return this.repo.verifyDriver(id);
  }

  // ─── Shift Management (Admin/Dispatcher) ────────────────────────────────

  async startShift(dto: StartShiftDto) {
    const driver = await this.repo.findDriverById(dto.driverId);
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.status !== DriverStatus.ACTIVE) {
      throw new BadRequestException('Driver must be ACTIVE to start a shift');
    }

    const amb = await this.repo.findAmbulanceById(dto.ambulanceId);
    if (!amb) throw new NotFoundException('Ambulance not found');
    if (amb.status === AmbulanceStatus.INACTIVE || amb.status === AmbulanceStatus.MAINTENANCE) {
      throw new BadRequestException('Ambulance is not serviceable');
    }

    const existingAmbulanceShift = await this.repo.findActiveShiftByAmbulance(dto.ambulanceId);
    if (existingAmbulanceShift) {
      throw new ConflictException('This ambulance already has an active shift');
    }

    const existingDriverShift = await this.repo.findActiveShiftByDriver(dto.driverId);
    if (existingDriverShift) {
      throw new ConflictException('Driver already has an active shift');
    }

    return this.repo.createShift({
      driverId:       dto.driverId,
      ambulanceId:    dto.ambulanceId,
      healthCenterId: amb.healthCenterId,
      shiftStart:     new Date(dto.shiftStart),
      shiftEnd:       dto.shiftEnd ? new Date(dto.shiftEnd) : undefined,
    });
  }

  async endShift(shiftId: string) {
    return this.repo.endShift(shiftId);
  }

  // ─── Booking: Patient Flow ───────────────────────────────────────────────

  async createBooking(
    patient: JwtRequestUser,
    dto: CreateBookingDto,
    idempotencyKey?: string,
  ) {
    // Idempotency check
    if (idempotencyKey) {
      const iKey = this.redisKey.idempotency('ambulance_booking', idempotencyKey);
      const cached = await this.redisGet(iKey);
      if (cached) return JSON.parse(cached) as object;
    }

    // Guardrail: at least one health center must be referenced
    await this.enforceHealthCenterGuardrail(dto.originCenterId, dto.destinationCenterId);

    const distKm = this.haversineKm(
      dto.pickupLatitude,
      dto.pickupLongitude,
      dto.destinationLatitude,
      dto.destinationLongitude,
    );
    const estimatedFare = new Prisma.Decimal(
      FARE_BASE_BDT + distKm * FARE_PER_KM_BDT,
    );

    const booking = await this.repo.createBooking({
      patientId:            patient.id,
      pickupAddress:        dto.pickupAddress,
      destinationAddress:   dto.destinationAddress,
      pickupLatitude:       dto.pickupLatitude,
      pickupLongitude:      dto.pickupLongitude,
      destinationLatitude:  dto.destinationLatitude,
      destinationLongitude: dto.destinationLongitude,
      vehicleTypeRequired:  dto.vehicleTypeRequired,
      estimatedDistance:    distKm,
      estimatedFare,
      emergencyType:        dto.emergencyType,
      patientCondition:     dto.patientCondition,
      specialRequirements:  dto.specialRequirements,
      originCenterId:       dto.originCenterId,
      destinationCenterId:  dto.destinationCenterId,
      bookedAt:             new Date(),
    });

    // Auto-dispatch: try to find nearest available ambulance immediately
    await this.tryAutoDispatch(booking.id, dto);

    const result = await this.repo.findBookingById(booking.id);

    if (idempotencyKey) {
      const iKey = this.redisKey.idempotency('ambulance_booking', idempotencyKey);
      await this.redisSetex(iKey, AMBULANCE_IDEMPOTENCY_TTL_S, JSON.stringify(result));
    }

    return result;
  }

  async getPatientBookings(patient: JwtRequestUser, query: BookingListQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 10;
    const [items, total] = await Promise.all([
      this.repo.listPatientBookings(patient.id, { skip, take }),
      this.repo.countPatientBookings(patient.id),
    ]);
    return { items, total, skip, take };
  }

  async getBookingDetail(bookingId: string, requester: JwtRequestUser) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    const isOwner = booking.patientId === requester.id;
    const isOps   = requester.role === UserRole.ADMIN || requester.role === UserRole.DISPATCHER;
    const isAssignedDriver =
      requester.role === UserRole.DRIVER &&
      (await this.repo.findDriverByUserId(requester.id))?.id === booking.driverId;

    if (!isOwner && !isOps && !isAssignedDriver) {
      throw new ForbiddenException('Access denied');
    }

    return booking;
  }

  async cancelBooking(bookingId: string, requester: JwtRequestUser, dto: CancelBookingDto) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    this.assertTransitionAllowed(booking.status, AmbulanceBookingStatus.CANCELLED);

    const isOwner = booking.patientId === requester.id;
    const isOps   = requester.role === UserRole.ADMIN || requester.role === UserRole.DISPATCHER;

    // Patients can only cancel while REQUESTED
    if (isOwner && booking.status !== AmbulanceBookingStatus.REQUESTED) {
      throw new ForbiddenException('Patients may only cancel unaccepted bookings');
    }
    if (!isOwner && !isOps) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.repo.transitionBookingStatus(
      bookingId,
      AmbulanceBookingStatus.CANCELLED,
      'cancelledAt',
      { cancelReason: dto.cancelReason },
    );

    // Release ambulance back to AVAILABLE if one was assigned
    if (booking.ambulanceId) {
      const amb = await this.repo.findAmbulanceById(booking.ambulanceId);
      if (amb) {
        await this.repo.updateAmbulanceStatus(
          booking.ambulanceId,
          AmbulanceStatus.AVAILABLE,
          amb.version,
        );
      }
    }

    return updated;
  }

  // ─── Dispatch: Ops Flow ──────────────────────────────────────────────────

  async getActiveQueue(params: { skip: number; take: number }) {
    const [items, total] = await Promise.all([
      this.repo.listActiveBookings(params),
      this.repo.countActiveBookings(),
    ]);
    return { items, total, skip: params.skip, take: params.take };
  }

  async manualDispatch(
    bookingId: string,
    dispatcher: JwtRequestUser,
    dto: ManualDispatchDto,
  ) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== AmbulanceBookingStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot dispatch a booking in status ${booking.status}`,
      );
    }

    const amb = await this.repo.findAmbulanceById(dto.ambulanceId);
    if (!amb) throw new NotFoundException('Ambulance not found');
    if (amb.status !== AmbulanceStatus.AVAILABLE) {
      throw new ConflictException('Selected ambulance is not available');
    }

    const driver = await this.repo.findDriverById(dto.driverId);
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.status !== DriverStatus.ACTIVE) {
      throw new BadRequestException('Driver is not active');
    }

    try {
      return await this.repo.assignAndAccept(
        bookingId,
        dto.ambulanceId,
        dto.driverId,
        dispatcher.id,
        dto.notes,
        dto.priority ?? 0,
        amb.version,
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'AMBULANCE_LOCK_FAILED') {
        throw new ConflictException(
          'Ambulance was assigned to another booking; please retry.',
        );
      }
      throw err;
    }
  }

  // ─── Driver Lifecycle ────────────────────────────────────────────────────

  async driverArrive(bookingId: string, driver: JwtRequestUser) {
    const booking = await this.requireDriverBooking(bookingId, driver);
    this.assertTransitionAllowed(booking.status, AmbulanceBookingStatus.ARRIVED);
    return this.repo.transitionBookingStatus(bookingId, AmbulanceBookingStatus.ARRIVED, 'arrivedAt');
  }

  async driverStartTransit(bookingId: string, driver: JwtRequestUser) {
    const booking = await this.requireDriverBooking(bookingId, driver);
    this.assertTransitionAllowed(booking.status, AmbulanceBookingStatus.IN_TRANSIT);
    return this.repo.transitionBookingStatus(bookingId, AmbulanceBookingStatus.IN_TRANSIT, 'startedAt');
  }

  async driverComplete(bookingId: string, driver: JwtRequestUser) {
    const booking = await this.requireDriverBooking(bookingId, driver);
    this.assertTransitionAllowed(booking.status, AmbulanceBookingStatus.COMPLETED);

    // Calculate actual fare (use estimated if no override)
    const actualFare = booking.actualFare ?? booking.estimatedFare;

    await this.repo.transitionBookingStatus(
      bookingId,
      AmbulanceBookingStatus.COMPLETED,
      'completedAt',
      { actualFare },
    );

    // Release ambulance
    if (booking.ambulanceId) {
      const amb = await this.repo.findAmbulanceById(booking.ambulanceId);
      if (amb) {
        await this.repo.updateAmbulanceStatus(
          booking.ambulanceId,
          AmbulanceStatus.AVAILABLE,
          amb.version,
        );
      }
    }

    // Initiate payment settlement asynchronously
    await this.finalizePayment(bookingId);

    return this.repo.findBookingById(bookingId);
  }

  // ─── Live Location ───────────────────────────────────────────────────────

  async pushLocation(bookingId: string, driver: JwtRequestUser, dto: PushLocationDto) {
    const booking = await this.requireDriverBooking(bookingId, driver);

    if (TERMINAL_STATUSES.includes(booking.status)) {
      throw new BadRequestException('Trip is already in a terminal state');
    }

    const ambulanceId = booking.ambulanceId!;

    const payload: LiveLocationPayload = {
      lat:        dto.latitude,
      lng:        dto.longitude,
      accuracy:   dto.accuracy ?? null,
      recordedAt: dto.recordedAt,
    };

    const serialized = JSON.stringify(payload);

    // Dual-write: Redis latest + DB audit trail
    await Promise.all([
      this.redisSetex(this.redisKey.ambulanceLocation(ambulanceId), AMBULANCE_LOCATION_TTL_S, serialized),
      this.redisSetex(this.redisKey.ambulanceBookingLocation(bookingId), AMBULANCE_LOCATION_TTL_S, serialized),
      this.repo.createLocationLog({
        ambulanceBookingId: bookingId,
        ambulanceId,
        latitude:   dto.latitude,
        longitude:  dto.longitude,
        accuracy:   dto.accuracy,
        address:    dto.address,
        recordedAt: new Date(dto.recordedAt),
      }),
    ]);

    return { recorded: true };
  }

  async getLiveLocation(bookingId: string, requester: JwtRequestUser) {
    const booking = await this.getBookingDetail(bookingId, requester);

    // Try Redis cache first
    const cacheKey = this.redisKey.ambulanceBookingLocation(bookingId);
    const cached   = await this.redisGet(cacheKey);

    if (cached) {
      const payload = JSON.parse(cached) as LiveLocationPayload;
      return {
        ambulanceId: booking.ambulanceId,
        bookingId,
        latitude:    payload.lat,
        longitude:   payload.lng,
        accuracy:    payload.accuracy,
        recordedAt:  payload.recordedAt,
        source:      'cache' as const,
      };
    }

    // Fallback to latest DB log
    const log = await this.repo.findLatestLocationLog(bookingId);
    if (!log) throw new NotFoundException('No location data available yet');

    return {
      ambulanceId: booking.ambulanceId,
      bookingId,
      latitude:    log.latitude,
      longitude:   log.longitude,
      accuracy:    log.accuracy,
      recordedAt:  log.recordedAt.toISOString(),
      source:      'db' as const,
    };
  }

  async getLocationTrail(bookingId: string, requester: JwtRequestUser) {
    await this.getBookingDetail(bookingId, requester);
    return this.repo.listLocationLogs(bookingId);
  }

  // ─── Payment Finalization ────────────────────────────────────────────────

  async finalizePayment(bookingId: string) {
    const data = await this.repo.findBookingPayment(bookingId);
    if (!data) return;

    // Idempotent: already settled
    if (data.paymentId) return;

    const fare = data.actualFare ?? data.estimatedFare;

    // Use Prisma transaction to create payment + link atomically
    const payment = await this.prisma.$transaction(async (tx) => {
      // Guard against duplicate (race condition)
      const fresh = await tx.ambulanceBooking.findUnique({
        where: { id: bookingId },
        select: { paymentId: true },
      });
      if (fresh?.paymentId) return null;

      const p = await tx.payment.create({
        data: {
          entityType:    PaymentEntityType.AMBULANCE,
          entityId:      bookingId,
          userId:        data.patientId,
          amount:        fare!,
          paymentMethod: PaymentMethodType.CASH,
          paymentStatus: PaymentStatus.PENDING_CASH,
          paymentGateway: PaymentGateway.MANUAL,
        },
      });

      await tx.ambulanceBooking.update({
        where: { id: bookingId },
        data: { paymentId: p.id, actualFare: fare },
      });

      return p;
    });

    return payment;
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────

  private async enforceHealthCenterGuardrail(
    originCenterId?: string,
    destinationCenterId?: string,
  ) {
    if (!originCenterId && !destinationCenterId) {
      throw new BadRequestException(
        'At least one of originCenterId or destinationCenterId must reference a valid health center.',
      );
    }

    const checkId = originCenterId ?? destinationCenterId!;
    const center = await this.repo.findHealthCenterById(checkId);
    if (!center) {
      throw new NotFoundException(
        `Health center ${checkId} not found. Pickup or destination must map to a registered health center.`,
      );
    }

    if (destinationCenterId && destinationCenterId !== checkId) {
      const destCenter = await this.repo.findHealthCenterById(destinationCenterId);
      if (!destCenter) {
        throw new NotFoundException(
          `Destination health center ${destinationCenterId} not found.`,
        );
      }
    }
  }

  private async tryAutoDispatch(
    bookingId: string,
    dto: CreateBookingDto,
  ): Promise<void> {
    try {
      const candidates = await this.repo.findDispatchCandidates({
        vehicleType:    dto.vehicleTypeRequired,
        healthCenterId: dto.originCenterId ?? dto.destinationCenterId,
      });

      if (candidates.length === 0) return;

      const ranked = this.rankCandidates(
        candidates,
        dto.pickupLatitude,
        dto.pickupLongitude,
      );

      const best = ranked[0];
      const activeShift = best.shifts[0];
      if (!activeShift) return;

      await this.repo.assignAndAccept(
        bookingId,
        best.id,
        activeShift.driverId,
        null, // system/auto-dispatch – no human dispatcher
        'Auto-dispatched',
        5,
        best.version,
      );
    } catch {
      // Auto-dispatch is best-effort; booking remains REQUESTED for manual dispatch
    }
  }

  private rankCandidates(
    candidates: Awaited<ReturnType<AmbulanceRepository['findDispatchCandidates']>>,
    pickupLat: number,
    pickupLng: number,
  ) {
    return candidates
      .map((amb) => ({
        ...amb,
        distanceKm: this.haversineKm(
          pickupLat,
          pickupLng,
          amb.latitude ?? 0,
          amb.longitude ?? 0,
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  private async requireDriverBooking(bookingId: string, driver: JwtRequestUser) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    const driverProfile = await this.repo.findDriverByUserId(driver.id);
    if (!driverProfile || booking.driverId !== driverProfile.id) {
      throw new ForbiddenException('This booking is not assigned to you');
    }

    return booking;
  }

  private assertTransitionAllowed(
    current: AmbulanceBookingStatus,
    target: AmbulanceBookingStatus,
  ) {
    const allowed = BOOKING_TRANSITIONS[current];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Transition from ${current} to ${target} is not allowed.`,
      );
    }
  }

  /** Haversine great-circle distance in kilometres. */
  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R  = 6371;
    const dL = ((lat2 - lat1) * Math.PI) / 180;
    const dN = ((lng2 - lng1) * Math.PI) / 180;
    const a  =
      Math.sin(dL / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dN / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
