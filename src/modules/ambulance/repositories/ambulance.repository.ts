import { Injectable } from '@nestjs/common';
import {
  AmbulanceBookingStatus,
  AmbulanceStatus,
  AmbulanceVehicleType,
  DriverStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AmbulanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Health Centers ──────────────────────────────────────────────────────

  listHealthCenters(filters?: { city?: string; state?: string }) {
    return this.prisma.healthCenter.findMany({
      where: {
        ...(filters?.city  ? { city:  { contains: filters.city,  mode: 'insensitive' } } : {}),
        ...(filters?.state ? { state: { contains: filters.state, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findHealthCenterById(id: string) {
    return this.prisma.healthCenter.findUnique({ where: { id } });
  }

  createHealthCenter(data: Prisma.HealthCenterUncheckedCreateInput) {
    return this.prisma.healthCenter.create({ data });
  }

  // ─── Ambulances ──────────────────────────────────────────────────────────

  listAmbulances(filters?: {
    healthCenterId?: string;
    status?: AmbulanceStatus;
  }) {
    return this.prisma.ambulance.findMany({
      where: {
        ...(filters?.healthCenterId ? { healthCenterId: filters.healthCenterId } : {}),
        ...(filters?.status         ? { status: filters.status }                 : {}),
      },
      include: {
        healthCenter: true,
        shifts: {
          where: { isActive: true },
          include: { driver: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } } },
          take: 1,
        },
      },
      orderBy: { vehicleNumber: 'asc' },
    });
  }

  findAmbulanceById(id: string) {
    return this.prisma.ambulance.findUnique({
      where: { id },
      include: { healthCenter: true },
    });
  }

  createAmbulance(data: Prisma.AmbulanceUncheckedCreateInput) {
    return this.prisma.ambulance.create({
      data,
      include: { healthCenter: true },
    });
  }

  updateAmbulanceStatus(id: string, status: AmbulanceStatus, currentVersion: number) {
    return this.prisma.ambulance.updateMany({
      where: { id, version: currentVersion },
      data: { status, version: { increment: 1 } },
    });
  }

  /** Returns AVAILABLE ambulances that have an active shift,
   *  optionally filtered by vehicle type. */
  findDispatchCandidates(filters: {
    vehicleType?: AmbulanceVehicleType;
    healthCenterId?: string;
  }) {
    return this.prisma.ambulance.findMany({
      where: {
        status: AmbulanceStatus.AVAILABLE,
        ...(filters.vehicleType  ? { vehicleType: filters.vehicleType }           : {}),
        ...(filters.healthCenterId ? { healthCenterId: filters.healthCenterId }   : {}),
        shifts: { some: { isActive: true } },
      },
      include: {
        shifts: {
          where: { isActive: true },
          include: { driver: true },
          take: 1,
        },
      },
    });
  }

  // ─── Driver Profiles ─────────────────────────────────────────────────────

  listDrivers(filters?: { healthCenterId?: string; status?: DriverStatus }) {
    return this.prisma.driverProfile.findMany({
      where: {
        ...(filters?.healthCenterId ? { healthCenterId: filters.healthCenterId } : {}),
        ...(filters?.status         ? { status: filters.status }                 : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        healthCenter: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findDriverById(id: string) {
    return this.prisma.driverProfile.findUnique({
      where: { id },
      include: { user: true, healthCenter: true },
    });
  }

  findDriverByUserId(userId: string) {
    return this.prisma.driverProfile.findUnique({ where: { userId } });
  }

  createDriver(data: Prisma.DriverProfileUncheckedCreateInput) {
    return this.prisma.driverProfile.create({
      data,
      include: { user: true, healthCenter: true },
    });
  }

  updateDriverStatus(id: string, status: DriverStatus) {
    return this.prisma.driverProfile.update({ where: { id }, data: { status } });
  }

  verifyDriver(id: string) {
    return this.prisma.driverProfile.update({
      where: { id },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  // ─── Shifts ──────────────────────────────────────────────────────────────

  findActiveShiftByAmbulance(ambulanceId: string) {
    return this.prisma.ambulanceShift.findFirst({
      where: { ambulanceId, isActive: true },
      include: { driver: true },
    });
  }

  findActiveShiftByDriver(driverId: string) {
    return this.prisma.ambulanceShift.findFirst({
      where: { driverId, isActive: true },
      include: { ambulance: true },
    });
  }

  createShift(data: Prisma.AmbulanceShiftUncheckedCreateInput) {
    return this.prisma.ambulanceShift.create({ data });
  }

  endShift(id: string) {
    return this.prisma.ambulanceShift.update({
      where: { id },
      data: { isActive: false, endedAt: new Date() },
    });
  }

  // ─── Bookings ────────────────────────────────────────────────────────────

  createBooking(data: Prisma.AmbulanceBookingUncheckedCreateInput) {
    return this.prisma.ambulanceBooking.create({
      data,
      include: {
        originCenter:      { select: { id: true, name: true } },
        destinationCenter: { select: { id: true, name: true } },
      },
    });
  }

  findBookingById(id: string) {
    return this.prisma.ambulanceBooking.findUnique({
      where: { id },
      include: {
        patient:           { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        ambulance:         { select: { id: true, vehicleNumber: true, vehicleType: true, latitude: true, longitude: true } },
        driver:            { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        originCenter:      { select: { id: true, name: true, address: true } },
        destinationCenter: { select: { id: true, name: true, address: true } },
        dispatchAssignment: true,
      },
    });
  }

  listPatientBookings(patientId: string, params: { skip: number; take: number }) {
    return this.prisma.ambulanceBooking.findMany({
      where: { patientId },
      orderBy: { bookedAt: 'desc' },
      skip: params.skip,
      take: params.take,
      include: {
        ambulance:         { select: { id: true, vehicleNumber: true, vehicleType: true } },
        originCenter:      { select: { id: true, name: true } },
        destinationCenter: { select: { id: true, name: true } },
      },
    });
  }

  countPatientBookings(patientId: string) {
    return this.prisma.ambulanceBooking.count({ where: { patientId } });
  }

  listActiveBookings(params: { skip: number; take: number }) {
    return this.prisma.ambulanceBooking.findMany({
      where: {
        status: {
          notIn: [AmbulanceBookingStatus.COMPLETED, AmbulanceBookingStatus.CANCELLED],
        },
      },
      orderBy: { bookedAt: 'asc' },
      skip: params.skip,
      take: params.take,
      include: {
        patient:           { select: { id: true, firstName: true, lastName: true, phone: true } },
        ambulance:         { select: { id: true, vehicleNumber: true } },
        originCenter:      { select: { id: true, name: true } },
        destinationCenter: { select: { id: true, name: true } },
      },
    });
  }

  countActiveBookings() {
    return this.prisma.ambulanceBooking.count({
      where: {
        status: {
          notIn: [AmbulanceBookingStatus.COMPLETED, AmbulanceBookingStatus.CANCELLED],
        },
      },
    });
  }

  /**
   * Atomic dispatch: assign ambulance + driver and transition booking to ACCEPTED.
   * When dispatcherId is null the assignment is auto-dispatch (no DispatchAssignment row).
   */
  async assignAndAccept(
    bookingId: string,
    ambulanceId: string,
    driverId: string,
    dispatcherId: string | null,
    notes: string | undefined,
    priority: number,
    ambulanceVersion: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Optimistic lock: fail if ambulance was modified concurrently.
      const lockResult = await tx.ambulance.updateMany({
        where: { id: ambulanceId, status: AmbulanceStatus.AVAILABLE, version: ambulanceVersion },
        data:  { status: AmbulanceStatus.ON_DUTY, version: { increment: 1 } },
      });

      if (lockResult.count === 0) {
        throw new Error('AMBULANCE_LOCK_FAILED');
      }

      const booking = await tx.ambulanceBooking.update({
        where: { id: bookingId },
        data: {
          ambulanceId,
          driverId,
          dispatchedBy: dispatcherId ?? undefined,
          status:      AmbulanceBookingStatus.ACCEPTED,
          acceptedAt:  new Date(),
        },
      });

      // Only record a DispatchAssignment when a human dispatcher is responsible.
      if (dispatcherId) {
        await tx.dispatchAssignment.create({
          data: {
            bookingId,
            dispatcherId,
            ambulanceId,
            driverId,
            notes,
            priority,
          },
        });
      }

      return booking;
    });
  }

  /** Transition booking status with timestamp update. */
  transitionBookingStatus(
    id: string,
    status: AmbulanceBookingStatus,
    timestampField: 'arrivedAt' | 'startedAt' | 'completedAt' | 'cancelledAt',
    extraData?: Prisma.AmbulanceBookingUncheckedUpdateInput,
  ) {
    return this.prisma.ambulanceBooking.update({
      where: { id },
      data: {
        status,
        [timestampField]: new Date(),
        ...extraData,
      },
    });
  }

  // ─── Location Logs ───────────────────────────────────────────────────────

  createLocationLog(data: Prisma.AmbulanceLocationLogUncheckedCreateInput) {
    return this.prisma.ambulanceLocationLog.create({ data });
  }

  findLatestLocationLog(bookingId: string) {
    return this.prisma.ambulanceLocationLog.findFirst({
      where: { ambulanceBookingId: bookingId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  listLocationLogs(bookingId: string, limit = 50) {
    return this.prisma.ambulanceLocationLog.findMany({
      where: { ambulanceBookingId: bookingId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  // ─── Dispatch Assignments ────────────────────────────────────────────────

  findDispatchAssignmentByBooking(bookingId: string) {
    return this.prisma.dispatchAssignment.findUnique({
      where: { bookingId },
      include: {
        dispatcher: { select: { id: true, firstName: true, lastName: true } },
        ambulance:  { select: { id: true, vehicleNumber: true } },
        driver:     { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
  }

  // ─── Payment ─────────────────────────────────────────────────────────────

  updateBookingPayment(bookingId: string, paymentId: string, actualFare: Prisma.Decimal) {
    return this.prisma.ambulanceBooking.update({
      where: { id: bookingId },
      data: { paymentId, actualFare },
    });
  }

  findBookingPayment(bookingId: string) {
    return this.prisma.ambulanceBooking.findUnique({
      where: { id: bookingId },
      select: { paymentId: true, actualFare: true, estimatedFare: true, patientId: true },
    });
  }
}
