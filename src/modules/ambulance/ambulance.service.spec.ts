import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AmbulanceBookingStatus, AmbulanceStatus, DriverStatus, UserRole } from '@prisma/client';
import { AmbulanceService } from './ambulance.service';
import { AmbulanceRepository } from './repositories/ambulance.repository';
import { RedisKeyService } from '../../common/redis/redis-key.service';
import { PrismaService } from '../../database/prisma.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<AmbulanceRepository> {
  return {
    listHealthCenters:           jest.fn(),
    findHealthCenterById:        jest.fn(),
    createHealthCenter:          jest.fn(),
    listAmbulances:              jest.fn(),
    findAmbulanceById:           jest.fn(),
    createAmbulance:             jest.fn(),
    updateAmbulanceStatus:       jest.fn(),
    findDispatchCandidates:      jest.fn(),
    listDrivers:                 jest.fn(),
    findDriverById:              jest.fn(),
    findDriverByUserId:          jest.fn(),
    createDriver:                jest.fn(),
    updateDriverStatus:          jest.fn(),
    verifyDriver:                jest.fn(),
    findActiveShiftByAmbulance:  jest.fn(),
    findActiveShiftByDriver:     jest.fn(),
    createShift:                 jest.fn(),
    endShift:                    jest.fn(),
    createBooking:               jest.fn(),
    findBookingById:             jest.fn(),
    listPatientBookings:         jest.fn(),
    countPatientBookings:        jest.fn(),
    listActiveBookings:          jest.fn(),
    countActiveBookings:         jest.fn(),
    assignAndAccept:             jest.fn(),
    transitionBookingStatus:     jest.fn(),
    createLocationLog:           jest.fn(),
    findLatestLocationLog:       jest.fn(),
    listLocationLogs:            jest.fn(),
    findDispatchAssignmentByBooking: jest.fn(),
    updateBookingPayment:        jest.fn(),
    findBookingPayment:          jest.fn(),
  } as unknown as jest.Mocked<AmbulanceRepository>;
}

function makePrisma(): jest.Mocked<Pick<PrismaService, '$transaction'>> {
  return { $transaction: jest.fn() };
}

function makeRedisKey(): jest.Mocked<RedisKeyService> {
  return {
    idempotency:              jest.fn().mockReturnValue('ikey'),
    ambulanceLocation:        jest.fn().mockReturnValue('amb_loc_key'),
    ambulanceBookingLocation: jest.fn().mockReturnValue('bk_loc_key'),
    activeAmbulanceBookings:  jest.fn().mockReturnValue('active_bk_key'),
  } as unknown as jest.Mocked<RedisKeyService>;
}

function makeService(
  repo = makeRepo(),
  prisma = makePrisma(),
  redisKey = makeRedisKey(),
): AmbulanceService {
  // Temporarily override REDIS_URL so no real Redis connection is made
  delete process.env.REDIS_URL;
  return new AmbulanceService(
    repo,
    prisma as unknown as PrismaService,
    redisKey,
  );
}

const patientUser = { id: 'patient-id', role: UserRole.PATIENT, email: 'p@test.com' };
const adminUser   = { id: 'admin-id',   role: UserRole.ADMIN,   email: 'a@test.com' };
const driverUser  = { id: 'driver-id',  role: UserRole.DRIVER,  email: 'd@test.com' };

const fakeHealthCenter = { id: 'hc-1', name: 'City Hospital', latitude: 23.8, longitude: 90.4 };
const fakeAmbulance    = { id: 'amb-1', vehicleNumber: 'DHK-001', vehicleType: 'BASIC', status: AmbulanceStatus.AVAILABLE, version: 0, healthCenterId: 'hc-1', latitude: 23.8, longitude: 90.4, healthCenter: fakeHealthCenter };
const fakeDriverProfile = { id: 'drv-prof-1', userId: 'driver-id', status: DriverStatus.ACTIVE, healthCenterId: 'hc-1', licenseNumber: 'LIC-1', licenseExpiryDate: new Date('2030-01-01') };
const fakeBooking = {
  id: 'bk-1',
  patientId: 'patient-id',
  ambulanceId: 'amb-1',
  driverId: 'drv-prof-1',
  status: AmbulanceBookingStatus.ACCEPTED,
  pickupLatitude: 23.8,
  pickupLongitude: 90.4,
  destinationLatitude: 23.9,
  destinationLongitude: 90.5,
  estimatedFare: { toString: () => '240.00' },
  actualFare: null,
  originCenterId: 'hc-1',
  destinationCenterId: null,
};

// ─── State Machine Tests ──────────────────────────────────────────────────────

describe('AmbulanceService – state machine', () => {
  it('assertTransitionAllowed: ACCEPTED → ARRIVED is valid', () => {
    const repo   = makeRepo();
    const svc    = makeService(repo);
    // Access private via cast
    expect(() =>
      (svc as unknown as { assertTransitionAllowed: (a: AmbulanceBookingStatus, b: AmbulanceBookingStatus) => void })
        .assertTransitionAllowed(AmbulanceBookingStatus.ACCEPTED, AmbulanceBookingStatus.ARRIVED),
    ).not.toThrow();
  });

  it('assertTransitionAllowed: COMPLETED → CANCELLED is invalid', () => {
    const svc = makeService();
    expect(() =>
      (svc as unknown as { assertTransitionAllowed: (a: AmbulanceBookingStatus, b: AmbulanceBookingStatus) => void })
        .assertTransitionAllowed(AmbulanceBookingStatus.COMPLETED, AmbulanceBookingStatus.CANCELLED),
    ).toThrow(BadRequestException);
  });

  it('assertTransitionAllowed: IN_TRANSIT → COMPLETED is valid', () => {
    const svc = makeService();
    expect(() =>
      (svc as unknown as { assertTransitionAllowed: (a: AmbulanceBookingStatus, b: AmbulanceBookingStatus) => void })
        .assertTransitionAllowed(AmbulanceBookingStatus.IN_TRANSIT, AmbulanceBookingStatus.COMPLETED),
    ).not.toThrow();
  });

  it('assertTransitionAllowed: REQUESTED → IN_TRANSIT skips a state (invalid)', () => {
    const svc = makeService();
    expect(() =>
      (svc as unknown as { assertTransitionAllowed: (a: AmbulanceBookingStatus, b: AmbulanceBookingStatus) => void })
        .assertTransitionAllowed(AmbulanceBookingStatus.REQUESTED, AmbulanceBookingStatus.IN_TRANSIT),
    ).toThrow(BadRequestException);
  });
});

// ─── Haversine Distance Tests ─────────────────────────────────────────────────

describe('AmbulanceService – haversine fare estimation', () => {
  it('calculates distance > 0 for distinct coordinates', () => {
    const svc = makeService();
    const dist = (svc as unknown as { haversineKm: (...args: number[]) => number })
      .haversineKm(23.8103, 90.4125, 23.7104, 90.4074);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(20); // Dhaka intra-city range
  });

  it('returns 0 for identical coordinates', () => {
    const svc = makeService();
    const dist = (svc as unknown as { haversineKm: (...args: number[]) => number })
      .haversineKm(23.8, 90.4, 23.8, 90.4);
    expect(dist).toBe(0);
  });
});

// ─── Guardrail Validation Tests ───────────────────────────────────────────────

describe('AmbulanceService – health center guardrail', () => {
  it('throws BadRequestException when no health center is provided', async () => {
    const repo = makeRepo();
    const svc  = makeService(repo);
    await expect(
      (svc as unknown as { enforceHealthCenterGuardrail: (a?: string, b?: string) => Promise<void> })
        .enforceHealthCenterGuardrail(undefined, undefined),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when provided center ID does not exist', async () => {
    const repo = makeRepo();
    repo.findHealthCenterById.mockResolvedValue(null);
    const svc = makeService(repo);
    await expect(
      (svc as unknown as { enforceHealthCenterGuardrail: (a?: string, b?: string) => Promise<void> })
        .enforceHealthCenterGuardrail('nonexistent-id', undefined),
    ).rejects.toThrow(NotFoundException);
  });

  it('passes when originCenterId maps to a valid center', async () => {
    const repo = makeRepo();
    repo.findHealthCenterById.mockResolvedValue(fakeHealthCenter as never);
    const svc = makeService(repo);
    await expect(
      (svc as unknown as { enforceHealthCenterGuardrail: (a?: string, b?: string) => Promise<void> })
        .enforceHealthCenterGuardrail('hc-1', undefined),
    ).resolves.toBeUndefined();
  });
});

// ─── cancelBooking Tests ──────────────────────────────────────────────────────

describe('AmbulanceService – cancelBooking', () => {
  it('patient can cancel REQUESTED booking', async () => {
    const repo = makeRepo();
    repo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: AmbulanceBookingStatus.REQUESTED,
      ambulanceId: null,
    } as never);
    repo.transitionBookingStatus.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.CANCELLED } as never);
    const svc = makeService(repo);

    const result = await svc.cancelBooking('bk-1', patientUser, { cancelReason: 'Changed mind' });
    expect(result.status).toBe(AmbulanceBookingStatus.CANCELLED);
  });

  it('patient CANNOT cancel ACCEPTED booking', async () => {
    const repo = makeRepo();
    repo.findBookingById.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.ACCEPTED } as never);
    const svc = makeService(repo);

    await expect(
      svc.cancelBooking('bk-1', patientUser, { cancelReason: 'Late' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('admin can cancel ACCEPTED booking', async () => {
    const repo = makeRepo();
    repo.findBookingById.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.ACCEPTED } as never);
    repo.transitionBookingStatus.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.CANCELLED } as never);
    repo.findAmbulanceById.mockResolvedValue(fakeAmbulance as never);
    repo.updateAmbulanceStatus.mockResolvedValue({ count: 1 } as never);
    const svc = makeService(repo);

    const result = await svc.cancelBooking('bk-1', adminUser, { cancelReason: 'Admin override' });
    expect(result.status).toBe(AmbulanceBookingStatus.CANCELLED);
  });

  it('throws when booking is COMPLETED (terminal state)', async () => {
    const repo = makeRepo();
    repo.findBookingById.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.COMPLETED } as never);
    const svc = makeService(repo);

    await expect(
      svc.cancelBooking('bk-1', adminUser, { cancelReason: 'Too late' }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── manualDispatch Tests ─────────────────────────────────────────────────────

describe('AmbulanceService – manualDispatch', () => {
  it('throws if booking is not REQUESTED', async () => {
    const repo = makeRepo();
    repo.findBookingById.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.ACCEPTED } as never);
    const svc = makeService(repo);

    await expect(
      svc.manualDispatch('bk-1', adminUser, { ambulanceId: 'amb-1', driverId: 'drv-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when ambulance lock fails', async () => {
    const repo = makeRepo();
    repo.findBookingById.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.REQUESTED } as never);
    repo.findAmbulanceById.mockResolvedValue(fakeAmbulance as never);
    repo.findDriverById.mockResolvedValue({ ...fakeDriverProfile, status: DriverStatus.ACTIVE } as never);
    repo.assignAndAccept.mockRejectedValue(new Error('AMBULANCE_LOCK_FAILED'));
    const svc = makeService(repo);

    await expect(
      svc.manualDispatch('bk-1', adminUser, { ambulanceId: 'amb-1', driverId: 'drv-1' }),
    ).rejects.toThrow(ConflictException);
  });
});

// ─── driverArrive / driverComplete Tests ─────────────────────────────────────

describe('AmbulanceService – driver lifecycle', () => {
  it('driverArrive succeeds when booking is ACCEPTED and driver owns it', async () => {
    const repo = makeRepo();
    repo.findBookingById.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.ACCEPTED } as never);
    repo.findDriverByUserId.mockResolvedValue({ id: 'drv-prof-1' } as never);
    repo.transitionBookingStatus.mockResolvedValue({ ...fakeBooking, status: AmbulanceBookingStatus.ARRIVED } as never);
    const svc = makeService(repo);

    const result = await svc.driverArrive('bk-1', driverUser);
    expect(result.status).toBe(AmbulanceBookingStatus.ARRIVED);
  });

  it('driverArrive throws ForbiddenException when driver not assigned', async () => {
    const repo = makeRepo();
    repo.findBookingById.mockResolvedValue({ ...fakeBooking, driverId: 'other-drv', status: AmbulanceBookingStatus.ACCEPTED } as never);
    repo.findDriverByUserId.mockResolvedValue({ id: 'drv-prof-1' } as never);
    const svc = makeService(repo);

    await expect(svc.driverArrive('bk-1', driverUser)).rejects.toThrow(ForbiddenException);
  });
});

// ─── registerAmbulance Tests ──────────────────────────────────────────────────

describe('AmbulanceService – registerAmbulance', () => {
  it('throws NotFoundException when health center does not exist', async () => {
    const repo = makeRepo();
    repo.findHealthCenterById.mockResolvedValue(null);
    const svc = makeService(repo);

    await expect(
      svc.registerAmbulance({ healthCenterId: 'bad-id', vehicleNumber: 'V-1', vehicleType: 'BASIC' as never }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates ambulance when health center exists', async () => {
    const repo = makeRepo();
    repo.findHealthCenterById.mockResolvedValue(fakeHealthCenter as never);
    repo.createAmbulance.mockResolvedValue({ id: 'amb-new', vehicleNumber: 'V-1' } as never);
    const svc = makeService(repo);

    const result = await svc.registerAmbulance({ healthCenterId: 'hc-1', vehicleNumber: 'V-1', vehicleType: 'BASIC' as never });
    expect(repo.createAmbulance).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleNumber: 'V-1', healthCenterId: 'hc-1' }),
    );
    expect(result).toBeDefined();
  });
});
