import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ReportStatus,
  SampleStatus,
  TestBookingStatus,
  UserRole,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { LabTestService } from './lab-test.service';
import { LabTestRepository } from './repositories/lab-test.repository';
import { RedisKeyService } from '../../common/redis/redis-key.service';
import { StorageService } from '../../common/storage/storage.service';
import { NotificationService } from '../notification/notification.service';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';

// ─── Mock factories ────────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<LabTestRepository> {
  return {
    listCenters: jest.fn(),
    findCenterById: jest.fn(),
    createCenter: jest.fn(),
    listTestsByCenter: jest.fn(),
    findTestById: jest.fn(),
    createTest: jest.fn(),
    updateTest: jest.fn(),
    searchTestsByName: jest.fn(),
    listPackagesByCenter: jest.fn(),
    findPackageWithItems: jest.fn(),
    createPackage: jest.fn(),
    updatePackage: jest.fn(),
    createBookingWithItems: jest.fn(),
    findBookingById: jest.fn(),
    listPatientBookings: jest.fn(),
    countPatientBookings: jest.fn(),
    listAllBookings: jest.fn(),
    countAllBookings: jest.fn(),
    updateBookingStatus: jest.fn(),
    updateSampleStatus: jest.fn(),
    confirmBookingPayment: jest.fn(),
    createReport: jest.fn(),
    findReportById: jest.fn(),
    findReportByToken: jest.fn(),
    listReportsByBooking: jest.fn(),
    updateReportStatus: jest.fn(),
    countUndeliveredReports: jest.fn(),
    listAllReports: jest.fn(),
    listPatientReports: jest.fn(),
  } as unknown as jest.Mocked<LabTestRepository>;
}

function makeRedisKeyService(): jest.Mocked<RedisKeyService> {
  return {
    labBookingIdempotency: jest.fn().mockReturnValue('idempotency:lab_booking:test-key'),
  } as unknown as jest.Mocked<RedisKeyService>;
}

function makeStorageService(): jest.Mocked<StorageService> {
  return {
    uploadFile: jest.fn(),
  } as unknown as jest.Mocked<StorageService>;
}

function makeNotificationService(): jest.Mocked<NotificationService> {
  return {
    enqueue: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<NotificationService>;
}

function makePatient(id = 'patient-1'): JwtRequestUser {
  return { id, role: UserRole.PATIENT, email: 'patient@test.com' };
}

function makeAdmin(): JwtRequestUser {
  return { id: 'admin-1', role: UserRole.ADMIN, email: 'admin@test.com' };
}

function makeBooking(overrides: Partial<any> = {}): any {
  return {
    id: 'booking-1',
    patientId: 'patient-1',
    diagnosticCenterId: 'center-1',
    bookingStatus: TestBookingStatus.PENDING_PAYMENT,
    sampleStatus: SampleStatus.PENDING,
    paymentStatus: 'PENDING',
    paymentId: 'payment-1',
    totalAmount: new Prisma.Decimal(500),
    items: [],
    diagnosticCenter: { id: 'center-1', name: 'Test Center' },
    patient: { id: 'patient-1', name: 'John Doe', email: 'patient@test.com' },
    payment: { id: 'payment-1', paymentStatus: 'PENDING' },
    reports: [],
    ...overrides,
  };
}

// ─── Build service under test ──────────────────────────────────────────────────

function buildService(
  repo: jest.Mocked<LabTestRepository>,
  storage: jest.Mocked<StorageService>,
  notifications: jest.Mocked<NotificationService>,
) {
  const redisKey = makeRedisKeyService();
  // Bypass Redis construction by stubbing env
  const originalRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;

  const svc = new LabTestService(repo, redisKey, storage, notifications);

  if (originalRedisUrl !== undefined) {
    process.env.REDIS_URL = originalRedisUrl;
  }

  return svc;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('LabTestService', () => {
  let repo: jest.Mocked<LabTestRepository>;
  let storage: jest.Mocked<StorageService>;
  let notifications: jest.Mocked<NotificationService>;
  let svc: LabTestService;

  beforeEach(() => {
    repo = makeRepo();
    storage = makeStorageService();
    notifications = makeNotificationService();
    svc = buildService(repo, storage, notifications);
  });

  // ── createBooking ──────────────────────────────────────────────────────────

  describe('createBooking', () => {
    it('correctly sums test + package prices into totalAmount', async () => {
      const center = { id: 'center-1', name: 'Center' };
      const test = {
        id: 'test-1',
        diagnosticCenterId: 'center-1',
        price: new Prisma.Decimal(200),
      };
      const pkg = {
        id: 'pkg-1',
        diagnosticCenterId: 'center-1',
        discountedPrice: new Prisma.Decimal(350),
        items: [],
      };

      repo.findCenterById.mockResolvedValue(center as any);
      repo.findTestById.mockResolvedValue(test as any);
      repo.findPackageWithItems.mockResolvedValue(pkg as any);
      repo.createBookingWithItems.mockResolvedValue({
        booking: makeBooking({ totalAmount: new Prisma.Decimal(550) }),
        payment: { id: 'payment-1' } as any,
      });

      const dto = {
        diagnosticCenterId: 'center-1',
        items: [{ testId: 'test-1' }, { packageId: 'pkg-1' }],
        sampleCollectionDate: '2026-06-01',
        sampleCollectionTime: '09:00',
        paymentMethod: 'CASH',
      };

      await svc.createBooking(makePatient(), dto as any);

      const call = repo.createBookingWithItems.mock.calls[0][0];
      expect(call.totalAmount.toNumber()).toBe(550);
    });

    it('throws BadRequestException when items array is empty', async () => {
      repo.findCenterById.mockResolvedValue({ id: 'center-1' } as any);

      await expect(
        svc.createBooking(makePatient(), {
          diagnosticCenterId: 'center-1',
          items: [],
          sampleCollectionDate: '2026-06-01',
          sampleCollectionTime: '09:00',
          paymentMethod: 'CASH',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when test belongs to different center', async () => {
      repo.findCenterById.mockResolvedValue({ id: 'center-1' } as any);
      repo.findTestById.mockResolvedValue({
        id: 'test-1',
        diagnosticCenterId: 'center-OTHER',
        price: new Prisma.Decimal(100),
      } as any);

      await expect(
        svc.createBooking(makePatient(), {
          diagnosticCenterId: 'center-1',
          items: [{ testId: 'test-1' }],
          sampleCollectionDate: '2026-06-01',
          sampleCollectionTime: '09:00',
          paymentMethod: 'CASH',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── cancelBooking ──────────────────────────────────────────────────────────

  describe('cancelBooking', () => {
    it('throws ForbiddenException when patient tries to cancel CONFIRMED booking', async () => {
      repo.findBookingById.mockResolvedValue(
        makeBooking({ bookingStatus: TestBookingStatus.CONFIRMED }),
      );

      await expect(
        svc.cancelBooking(
          'booking-1',
          makePatient(),
          { cancellationReason: 'Changed mind' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to cancel a CONFIRMED booking', async () => {
      repo.findBookingById.mockResolvedValue(
        makeBooking({ bookingStatus: TestBookingStatus.CONFIRMED }),
      );
      repo.updateBookingStatus.mockResolvedValue({} as any);

      await expect(
        svc.cancelBooking(
          'booking-1',
          makeAdmin(),
          { cancellationReason: 'Admin override' },
        ),
      ).resolves.not.toThrow();
    });

    it('allows patient to cancel PENDING_PAYMENT booking', async () => {
      repo.findBookingById.mockResolvedValue(makeBooking());
      repo.updateBookingStatus.mockResolvedValue({} as any);

      await expect(
        svc.cancelBooking(
          'booking-1',
          makePatient(),
          { cancellationReason: 'Not needed' },
        ),
      ).resolves.not.toThrow();
    });
  });

  // ── updateSampleStatus ─────────────────────────────────────────────────────

  describe('updateSampleStatus', () => {
    it('throws BadRequestException for invalid transition (COMPLETED → PENDING)', async () => {
      repo.findBookingById.mockResolvedValue(
        makeBooking({
          bookingStatus: TestBookingStatus.CONFIRMED,
          sampleStatus: SampleStatus.COMPLETED,
        }),
      );

      await expect(
        svc.updateSampleStatus('booking-1', SampleStatus.PENDING),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows valid transition PENDING → COLLECTED and sets sampleCollectedAt', async () => {
      repo.findBookingById.mockResolvedValue(
        makeBooking({
          bookingStatus: TestBookingStatus.CONFIRMED,
          sampleStatus: SampleStatus.PENDING,
        }),
      );
      repo.updateSampleStatus.mockResolvedValue({} as any);

      await svc.updateSampleStatus('booking-1', SampleStatus.COLLECTED);

      const call = repo.updateSampleStatus.mock.calls[0];
      expect(call[1]).toBe(SampleStatus.COLLECTED);
      expect(call[2]?.sampleCollectedAt).toBeInstanceOf(Date);
    });

    it('throws BadRequestException when booking is not CONFIRMED', async () => {
      repo.findBookingById.mockResolvedValue(
        makeBooking({
          bookingStatus: TestBookingStatus.PENDING_PAYMENT,
          sampleStatus: SampleStatus.PENDING,
        }),
      );

      await expect(
        svc.updateSampleStatus('booking-1', SampleStatus.COLLECTED),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── confirmPayment ─────────────────────────────────────────────────────────

  describe('confirmPayment', () => {
    it('is idempotent — does not call confirmBookingPayment when already PAID', async () => {
      repo.findBookingById.mockResolvedValue(
        makeBooking({ paymentStatus: 'PAID', bookingStatus: TestBookingStatus.CONFIRMED }),
      );

      await svc.confirmPayment('booking-1', {});

      expect(repo.confirmBookingPayment).not.toHaveBeenCalled();
    });

    it('confirms payment and transitions booking to CONFIRMED', async () => {
      repo.findBookingById
        .mockResolvedValueOnce(makeBooking())
        .mockResolvedValueOnce(
          makeBooking({ paymentStatus: 'PAID', bookingStatus: TestBookingStatus.CONFIRMED }),
        );
      repo.confirmBookingPayment.mockResolvedValue([{}, {}] as any);

      const result = await svc.confirmPayment('booking-1', { transactionId: 'txn-abc' });

      expect(repo.confirmBookingPayment).toHaveBeenCalledWith(
        'booking-1',
        'payment-1',
        'txn-abc',
      );
    });
  });

  // ── uploadReport ───────────────────────────────────────────────────────────

  describe('uploadReport', () => {
    it('calls StorageService.uploadFile and creates TestReport with generated token', async () => {
      repo.findBookingById.mockResolvedValue(
        makeBooking({
          bookingStatus: TestBookingStatus.CONFIRMED,
          sampleStatus: SampleStatus.COMPLETED,
        }),
      );
      storage.uploadFile.mockResolvedValue(
        'https://cdn.test.com/reports/booking-1/file.pdf',
      );
      repo.createReport.mockResolvedValue({
        id: 'report-1',
        reportToken: 'some-uuid',
        reportUrl: 'https://cdn.test.com/reports/booking-1/file.pdf',
        reportFileName: 'result.pdf',
        reportStatus: ReportStatus.READY,
      } as any);

      const file = {
        buffer: Buffer.from('pdf content'),
        originalname: 'result.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      await svc.uploadReport('booking-1', file);

      expect(storage.uploadFile).toHaveBeenCalled();
      const createCall = repo.createReport.mock.calls[0][0];
      expect(createCall.reportToken).toBeDefined();
      expect(typeof createCall.reportToken).toBe('string');
      expect(createCall.reportUrl).toBe(
        'https://cdn.test.com/reports/booking-1/file.pdf',
      );
    });

    it('throws BadRequestException for invalid MIME type', async () => {
      repo.findBookingById.mockResolvedValue(
        makeBooking({
          bookingStatus: TestBookingStatus.CONFIRMED,
          sampleStatus: SampleStatus.COMPLETED,
        }),
      );

      const file = {
        buffer: Buffer.from('data'),
        originalname: 'report.exe',
        mimetype: 'application/octet-stream',
        size: 100,
      } as Express.Multer.File;

      await expect(svc.uploadReport('booking-1', file)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── deliverReport ──────────────────────────────────────────────────────────

  describe('deliverReport', () => {
    it('enqueues report-ready notification and sets bookingStatus=COMPLETED when last report', async () => {
      const report = {
        id: 'report-1',
        bookingId: 'booking-1',
        reportToken: 'token-abc',
        reportStatus: ReportStatus.READY,
        booking: {
          bookingStatus: TestBookingStatus.CONFIRMED,
          patient: { id: 'patient-1', name: 'John', email: 'john@test.com' },
          diagnosticCenter: { id: 'center-1', name: 'Med Center' },
        },
      };

      repo.findReportById
        .mockResolvedValueOnce(report as any)
        .mockResolvedValueOnce({ ...report, reportStatus: ReportStatus.DELIVERED } as any);
      repo.updateReportStatus.mockResolvedValue({} as any);
      repo.countUndeliveredReports.mockResolvedValue(0);
      repo.updateBookingStatus.mockResolvedValue({} as any);

      await svc.deliverReport('report-1');

      expect(notifications.enqueue).toHaveBeenCalled();
      expect(repo.updateBookingStatus).toHaveBeenCalledWith(
        'booking-1',
        TestBookingStatus.COMPLETED,
        expect.objectContaining({ completedAt: expect.any(Date) }),
      );
    });

    it('does not complete booking when undelivered reports remain', async () => {
      const report = {
        id: 'report-1',
        bookingId: 'booking-1',
        reportToken: 'token-abc',
        reportStatus: ReportStatus.READY,
        booking: {
          patient: { id: 'patient-1', name: 'Jane', email: 'jane@test.com' },
          diagnosticCenter: { name: 'Lab' },
        },
      };

      repo.findReportById
        .mockResolvedValueOnce(report as any)
        .mockResolvedValueOnce({ ...report, reportStatus: ReportStatus.DELIVERED } as any);
      repo.updateReportStatus.mockResolvedValue({} as any);
      repo.countUndeliveredReports.mockResolvedValue(2);

      await svc.deliverReport('report-1');

      expect(repo.updateBookingStatus).not.toHaveBeenCalled();
    });
  });

  // ── getReportByToken ───────────────────────────────────────────────────────

  describe('getReportByToken', () => {
    it('returns report data without requiring auth context', async () => {
      repo.findReportByToken.mockResolvedValue({
        reportUrl: 'https://cdn.test.com/file.pdf',
        reportFileName: 'report.pdf',
      } as any);

      const result = await svc.getReportByToken('some-token');

      expect(result).toEqual({
        reportUrl: 'https://cdn.test.com/file.pdf',
        reportFileName: 'report.pdf',
      });
      expect(repo.findReportByToken).toHaveBeenCalledWith('some-token');
    });

    it('throws NotFoundException for unknown token', async () => {
      repo.findReportByToken.mockResolvedValue(null);

      await expect(svc.getReportByToken('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getAllReports ──────────────────────────────────────────────────────────

  describe('getAllReports', () => {
    it('returns paginated results with patient name, center name, test name, status', async () => {
      const row = {
        id: 'report-1',
        reportFileName: 'test.pdf',
        reportToken: 'tok',
        reportStatus: ReportStatus.DELIVERED,
        deliveredAt: new Date(),
        createdAt: new Date(),
        bookingId: 'booking-1',
        booking: {
          bookingStatus: TestBookingStatus.COMPLETED,
          patient: { id: 'p1', name: 'Alice', email: 'alice@test.com' },
          diagnosticCenter: { name: 'BioLab' },
        },
        test: { name: 'CBC Test' },
      };

      repo.listAllReports.mockResolvedValue({ total: 1, rows: [row] as any });

      const result = await svc.getAllReports({});

      expect(result.total).toBe(1);
      expect(result.data[0].patientName).toBe('Alice');
      expect(result.data[0].centerName).toBe('BioLab');
      expect(result.data[0].testName).toBe('CBC Test');
      expect(result.data[0].bookingStatus).toBe(TestBookingStatus.COMPLETED);
    });
  });

  // ── getMyReports ───────────────────────────────────────────────────────────

  describe('getMyReports', () => {
    it('returns patient reports from all bookings including download token', async () => {
      const row = {
        id: 'report-1',
        reportFileName: 'cbc.pdf',
        reportToken: 'download-token',
        reportStatus: ReportStatus.DELIVERED,
        deliveredAt: new Date(),
        createdAt: new Date(),
        bookingId: 'booking-1',
        booking: {
          diagnosticCenter: { name: 'City Lab' },
        },
        test: { name: 'CBC' },
      };

      repo.listPatientReports.mockResolvedValue({ total: 1, rows: [row] as any });

      const result = await svc.getMyReports(makePatient(), {});

      expect(result.total).toBe(1);
      expect(result.data[0].reportToken).toBe('download-token');
      expect(result.data[0].centerName).toBe('City Lab');
      expect(result.data[0].testName).toBe('CBC');
    });
  });
});
