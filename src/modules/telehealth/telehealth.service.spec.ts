import { BadRequestException, ConflictException } from '@nestjs/common';
import { TelehealthPresence, TelehealthStatus } from '@prisma/client';
import { TelehealthService } from './telehealth.service';

describe('TelehealthService', () => {
  const now = new Date('2026-08-24T12:00:00.000Z');

  const repo = {
    findById: jest.fn(),
    findEligibleCandidates: jest.fn(),
    claimDoctorAndOffer: jest.fn(),
    queueRequest: jest.fn(),
    releaseDoctorClaim: jest.fn(),
    acceptOffer: jest.fn(),
    markMissed: jest.fn(),
    findStaleClaims: jest.fn(),
    findWaitingQueue: jest.fn(),
    findExpiredOffers: jest.fn(),
    findExpiredSearches: jest.fn(),
    createRequest: jest.fn(),
    findDoctorProfileByUserId: jest.fn(),
    countPendingOffers: jest.fn(),
    updatePresence: jest.fn(),
    createSession: jest.fn(),
    completeWithPayment: jest.fn(),
    clearDoctorClaimByTelehealthId: jest.fn(),
  };

  const redisKey = {
    telehealthIdempotency: jest.fn((k: string) => `idempotency:${k}`),
  };

  const notifications = { safeEnqueue: jest.fn() };
  const video = {
    createRoom: jest.fn().mockResolvedValue({ roomId: 'room_1', roomHandle: 'handle' }),
    mintJoinToken: jest.fn().mockResolvedValue({ token: 'tok', expiresAt: new Date(now.getTime() + 600000) }),
  };

  let service: TelehealthService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();
    service = new TelehealthService(
      repo as never,
      redisKey as never,
      notifications as never,
      video as never,
    );
    (service as unknown as { redis: null }).redis = null;
    (service as unknown as { reconcileQueue: null }).reconcileQueue = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('excludes doctors with activeTelehealthId from candidates', async () => {
    repo.findById.mockResolvedValue({
      id: 'th-1',
      status: TelehealthStatus.REQUESTED,
      attemptedDoctorIds: [],
      offerAttempts: 0,
      searchExpiresAt: new Date(now.getTime() + 180000),
      doctorId: null,
      patient: { id: 'p1', firstName: 'A', lastName: 'B', email: 'p@test.com', phone: '+1' },
      patientId: 'p1',
      consultationFee: { toString: () => '500' },
      queuePriority: 0,
      offerExpiresAt: null,
      emergencyType: null,
      reasonForVisit: null,
      notes: null,
      requestedAt: now,
      acceptedAt: null,
      startedAt: null,
      endedAt: null,
      cancelledAt: null,
    });
    repo.findEligibleCandidates.mockResolvedValue([]);
    repo.findStaleClaims.mockResolvedValue([]);

    await (service as unknown as { tryOfferOrQueue: (id: string) => Promise<unknown> }).tryOfferOrQueue('th-1');

    expect(repo.findEligibleCandidates).toHaveBeenCalledWith([], expect.any(Date));
  });

  it('accept throws ConflictException when offer expired', async () => {
    repo.acceptOffer.mockResolvedValue(null);
    await expect(
      service.acceptOffer('th-1', { id: 'd1', role: 'DOCTOR', email: 'd@test.com' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('marks request MISSED when searchExpiresAt passed', async () => {
    repo.findById.mockResolvedValue({
      id: 'th-1',
      status: TelehealthStatus.REQUESTED,
      attemptedDoctorIds: [],
      offerAttempts: 0,
      searchExpiresAt: new Date(now.getTime() - 1000),
      doctorId: null,
      patient: { id: 'p1', firstName: 'A', lastName: 'B', email: 'p@test.com', phone: '+1' },
    });
    repo.markMissed.mockResolvedValue({ id: 'th-1', status: TelehealthStatus.MISSED });
    repo.findStaleClaims.mockResolvedValue([]);

    await (service as unknown as { tryOfferOrQueue: (id: string) => Promise<unknown> }).tryOfferOrQueue('th-1');
    expect(repo.markMissed).toHaveBeenCalledWith('th-1');
  });

  it('reclaims stale claim for terminal appointment', async () => {
    repo.findStaleClaims.mockResolvedValue([{ userId: 'd1', activeTelehealthId: 'th-old' }]);
    repo.findById.mockResolvedValue({ id: 'th-old', status: TelehealthStatus.COMPLETED, offerExpiresAt: null });
    repo.clearDoctorClaimByTelehealthId.mockResolvedValue({ count: 1 });

    await (service as unknown as { reconcileClaims: () => Promise<void> }).reconcileClaims();
    expect(repo.clearDoctorClaimByTelehealthId).toHaveBeenCalledWith('th-old');
  });

  it('maps waitingForDoctor when queued', () => {
    const mapped = (service as unknown as {
      mapRequest: (row: object) => { waitingForDoctor: boolean };
    }).mapRequest({
      id: 'th-1',
      patientId: 'p1',
      doctorId: null,
      status: TelehealthStatus.REQUESTED,
      queuePriority: 0,
      offerExpiresAt: null,
      searchExpiresAt: now,
      offerAttempts: 0,
      emergencyType: null,
      reasonForVisit: null,
      notes: null,
      consultationFee: { toString: () => '500' },
      requestedAt: now,
      acceptedAt: null,
      startedAt: null,
      endedAt: null,
      cancelledAt: null,
      patient: { id: 'p1', firstName: 'A', lastName: 'B', phone: '+1' },
      doctor: null,
    });
    expect(mapped.waitingForDoctor).toBe(true);
  });

  it('effectiveAvailability returns BUSY for busy presence', () => {
    const result = (service as unknown as {
      effectiveAvailability: (p: object) => string;
    }).effectiveAvailability({
      isProvideTeleHealth: true,
      activeTelehealthId: null,
      telehealthPresence: TelehealthPresence.BUSY,
      telehealthOnlineUntil: new Date(now.getTime() + 60000),
    });
    expect(result).toBe('BUSY');
  });
});
