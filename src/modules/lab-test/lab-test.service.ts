import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReportStatus,
  SampleStatus,
  TestBookingStatus,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import { RedisKeyService } from '../../common/redis/redis-key.service';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../../common/mail/mail.service';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { LabTestRepository } from './repositories/lab-test.repository';
import type { LabReportFile } from './types/lab-test.types';
import {
  AdminReportListQueryDto,
  BookingListQueryDto,
  CancelBookingDto,
  ConfirmPaymentDto,
  CreateBookingDto,
  CreateDiagnosticCenterDto,
  CreateLabTestDto,
  CreateTestPackageDto,
  TestSearchQueryDto,
  UpdateLabTestDto,
  UpdateTestPackageDto,
} from './dto/lab-test-request.dto';
import {
  ALLOWED_REPORT_MIME_TYPES,
  BOOKING_STATUS_TRANSITIONS,
  LAB_IDEMPOTENCY_TTL_S,
  MAX_REPORT_FILE_SIZE_BYTES,
  SAMPLE_TRANSITIONS,
} from './constants/lab-test.constants';

@Injectable()
export class LabTestService {
  private readonly logger = new Logger(LabTestService.name);
  private readonly redis: Redis | null;

  constructor(
    private readonly repo: LabTestRepository,
    private readonly redisKey: RedisKeyService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err: Error) =>
        this.logger.warn(`Redis error: ${err.message}`),
      );
    } else {
      this.logger.warn('REDIS_URL not set — idempotency guard disabled.');
      this.redis = null;
    }
  }

  // ─── Catalog ──────────────────────────────────────────────────────────────

  listCenters() {
    return this.repo.listCenters();
  }

  async createCenter(dto: CreateDiagnosticCenterDto) {
    return this.repo.createCenter({
      name: dto.name,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      zipCode: dto.zipCode,
      phone: dto.phone,
      email: dto.email,
      latitude: dto.lat,
      longitude: dto.lng,
      operatingHours: dto.operatingHours,
    });
  }

  listTests(centerId: string) {
    return this.repo.listTestsByCenter(centerId);
  }

  async createTest(centerId: string, dto: CreateLabTestDto) {
    await this.requireCenter(centerId);
    return this.repo.createTest(centerId, {
      name: dto.name,
      code: dto.code,
      description: dto.description,
      price: new Prisma.Decimal(dto.price),
      turnaroundDays: dto.turnaroundDays,
      sampleType: dto.sampleType,
      instructions: dto.instructions,
      requiresFasting: dto.requiresFasting,
    });
  }

  async updateTest(testId: string, dto: UpdateLabTestDto) {
    await this.requireTest(testId);
    const data: Prisma.LabTestUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.turnaroundDays !== undefined) data.turnaroundDays = dto.turnaroundDays;
    if (dto.sampleType !== undefined) data.sampleType = dto.sampleType;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.requiresFasting !== undefined) data.requiresFasting = dto.requiresFasting;
    return this.repo.updateTest(testId, data);
  }

  listPackages(centerId: string) {
    return this.repo.listPackagesByCenter(centerId);
  }

  async createPackage(centerId: string, dto: CreateTestPackageDto) {
    await this.requireCenter(centerId);
    return this.repo.createPackage(
      centerId,
      {
        name: dto.name,
        description: dto.description,
        originalPrice: new Prisma.Decimal(dto.originalPrice),
        discountedPrice: new Prisma.Decimal(dto.discountedPrice),
        validityDays: dto.validityDays,
      },
      dto.testIds,
    );
  }

  async updatePackage(packageId: string, dto: UpdateTestPackageDto) {
    const data: Prisma.TestPackageUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.originalPrice !== undefined)
      data.originalPrice = new Prisma.Decimal(dto.originalPrice);
    if (dto.discountedPrice !== undefined)
      data.discountedPrice = new Prisma.Decimal(dto.discountedPrice);
    if (dto.validityDays !== undefined) data.validityDays = dto.validityDays;
    return this.repo.updatePackage(packageId, data);
  }

  searchTests(query: TestSearchQueryDto) {
    return this.repo.searchTestsByName(query);
  }

  // ─── Booking ──────────────────────────────────────────────────────────────

  async createBooking(
    patient: JwtRequestUser,
    dto: CreateBookingDto,
    idempotencyKey?: string,
  ) {
    // Idempotency guard
    if (idempotencyKey && this.redis) {
      const cacheKey = this.redisKey.labBookingIdempotency(idempotencyKey);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as object;
      }
    }

    const center = await this.requireCenter(dto.diagnosticCenterId);

    if (dto.items.length === 0) {
      throw new BadRequestException('At least one test or package must be selected.');
    }

    // Resolve items and compute total
    const resolvedItems: Array<{ testId?: string; packageId?: string; price: Prisma.Decimal }> =
      [];
    let total = new Prisma.Decimal(0);

    for (const item of dto.items) {
      if (!item.testId && !item.packageId) {
        throw new BadRequestException('Each item must have either testId or packageId.');
      }
      if (item.testId && item.packageId) {
        throw new BadRequestException(
          'Each item must specify either testId or packageId, not both.',
        );
      }
      if (item.testId) {
        const test = await this.requireTest(item.testId);
        if (test.diagnosticCenterId !== dto.diagnosticCenterId) {
          throw new BadRequestException(
            `Test ${item.testId} does not belong to the selected center.`,
          );
        }
        resolvedItems.push({ testId: item.testId, price: test.price });
        total = total.plus(test.price);
      } else if (item.packageId) {
        const pkg = await this.repo.findPackageWithItems(item.packageId);
        if (!pkg) throw new NotFoundException(`Package ${item.packageId} not found.`);
        if (pkg.diagnosticCenterId !== dto.diagnosticCenterId) {
          throw new BadRequestException(
            `Package ${item.packageId} does not belong to the selected center.`,
          );
        }
        resolvedItems.push({ packageId: item.packageId, price: pkg.discountedPrice });
        total = total.plus(pkg.discountedPrice);
      }
    }

    const result = await this.repo.createBookingWithItems({
      patientId: patient.id,
      diagnosticCenterId: center.id,
      sampleCollectionDate: new Date(dto.sampleCollectionDate),
      sampleCollectionTime: dto.sampleCollectionTime,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      totalAmount: total,
      items: resolvedItems,
    });

    if (idempotencyKey && this.redis) {
      const cacheKey = this.redisKey.labBookingIdempotency(idempotencyKey);
      await this.redis.set(
        cacheKey,
        JSON.stringify(result.booking),
        'EX',
        LAB_IDEMPOTENCY_TTL_S,
      );
    }

    return result.booking;
  }

  async getMyBookings(patient: JwtRequestUser, query: BookingListQueryDto) {
    const [data, total] = await Promise.all([
      this.repo.listPatientBookings(patient.id, query),
      this.repo.countPatientBookings(patient.id),
    ]);
    return { total, data };
  }

  async getBookingDetail(bookingId: string, requester: JwtRequestUser) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found.');
    if (
      requester.role !== UserRole.ADMIN &&
      booking.patientId !== requester.id
    ) {
      throw new ForbiddenException('Access denied.');
    }
    return booking;
  }

  async cancelBooking(
    bookingId: string,
    requester: JwtRequestUser,
    dto: CancelBookingDto,
  ) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found.');

    if (
      requester.role !== UserRole.ADMIN &&
      booking.patientId !== requester.id
    ) {
      throw new ForbiddenException('Access denied.');
    }

    // Patients can only cancel PENDING_PAYMENT bookings
    if (
      requester.role !== UserRole.ADMIN &&
      booking.bookingStatus !== TestBookingStatus.PENDING_PAYMENT
    ) {
      throw new ForbiddenException(
        'Patients can only cancel bookings that are pending payment.',
      );
    }

    this.assertBookingTransition(booking.bookingStatus, TestBookingStatus.CANCELLED);

    return this.repo.updateBookingStatus(bookingId, TestBookingStatus.CANCELLED, {
      cancelledAt: new Date(),
      cancellationReason: dto.cancellationReason,
    });
  }

  async getAllBookings(query: BookingListQueryDto) {
    const [data, total] = await Promise.all([
      this.repo.listAllBookings(query),
      this.repo.countAllBookings(),
    ]);
    return { total, data };
  }

  // ─── Payment ──────────────────────────────────────────────────────────────

  async confirmPayment(bookingId: string, dto: ConfirmPaymentDto) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found.');

    // Idempotent: already confirmed
    if (booking.paymentStatus === 'PAID') {
      return booking;
    }

    if (booking.bookingStatus === TestBookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot confirm payment for a cancelled booking.');
    }

    if (!booking.paymentId) {
      throw new BadRequestException('Booking has no associated payment record.');
    }

    await this.repo.confirmBookingPayment(
      bookingId,
      booking.paymentId,
      dto.transactionId,
    );

    return this.repo.findBookingById(bookingId);
  }

  // ─── Sample Lifecycle ─────────────────────────────────────────────────────

  async updateSampleStatus(bookingId: string, newStatus: SampleStatus) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found.');

    if (booking.bookingStatus !== TestBookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Sample status can only be updated for confirmed bookings.',
      );
    }

    const allowed = SAMPLE_TRANSITIONS[booking.sampleStatus];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition sample from ${booking.sampleStatus} to ${newStatus}.`,
      );
    }

    const extra: Partial<{ sampleCollectedAt: Date }> = {};
    if (newStatus === SampleStatus.COLLECTED) {
      extra.sampleCollectedAt = new Date();
    }

    return this.repo.updateSampleStatus(bookingId, newStatus, extra);
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  async uploadReport(
    bookingId: string,
    file: LabReportFile,
    testId?: string,
  ) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found.');

    if (booking.bookingStatus !== TestBookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Reports can only be uploaded for confirmed bookings.',
      );
    }

    if (booking.sampleStatus !== SampleStatus.COMPLETED) {
      throw new BadRequestException(
        'Reports can only be uploaded after sample processing is complete.',
      );
    }

    if (!ALLOWED_REPORT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_REPORT_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_REPORT_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds maximum allowed size (10 MB).');
    }

    const objectKey = `reports/${bookingId}/${Date.now()}-${file.originalname}`;
    const url = await this.storage.uploadFile(file.buffer, objectKey, file.mimetype);

    return this.repo.createReport({
      bookingId,
      testId: testId ?? null,
      reportToken: randomUUID(),
      reportUrl: url,
      reportFileName: file.originalname,
    });
  }

  async deliverReport(reportId: string) {
    const report = await this.repo.findReportById(reportId);
    if (!report) throw new NotFoundException('Report not found.');

    if (report.reportStatus !== ReportStatus.READY) {
      throw new BadRequestException(
        `Report is not in READY state (current: ${report.reportStatus}).`,
      );
    }

    await this.repo.updateReportStatus(reportId, ReportStatus.DELIVERED, {
      deliveredAt: new Date(),
    });

    // Send email notification
    const patient = report.booking.patient;
    if (patient.email) {
      await this.mail.sendReportReady({
        to: patient.email,
        patientName: `${patient.firstName} ${patient.lastName}`,
        centerName: report.booking.diagnosticCenter.name,
        reportToken: report.reportToken,
      });
    }

    // Auto-complete booking if all reports delivered
    const undelivered = await this.repo.countUndeliveredReports(report.bookingId);
    if (undelivered === 0) {
      await this.repo.updateBookingStatus(
        report.bookingId,
        TestBookingStatus.COMPLETED,
        { completedAt: new Date() },
      );
    }

    return this.repo.findReportById(reportId);
  }

  async getReportsByBooking(bookingId: string, requester: JwtRequestUser) {
    const booking = await this.repo.findBookingById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found.');
    if (
      requester.role !== UserRole.ADMIN &&
      booking.patientId !== requester.id
    ) {
      throw new ForbiddenException('Access denied.');
    }
    return this.repo.listReportsByBooking(bookingId);
  }

  async getReportByToken(token: string) {
    const report = await this.repo.findReportByToken(token);
    if (!report) throw new NotFoundException('Report not found.');
    return { reportUrl: report.reportUrl, reportFileName: report.reportFileName };
  }

  async getAllReports(query: AdminReportListQueryDto) {
    const { total, rows } = await this.repo.listAllReports(query);
    const data = rows.map((r) => ({
      id: r.id,
      reportFileName: r.reportFileName,
      reportToken: r.reportToken,
      reportStatus: r.reportStatus,
      deliveredAt: r.deliveredAt,
      createdAt: r.createdAt,
      bookingId: r.bookingId,
      bookingStatus: r.booking.bookingStatus,
      patientId: r.booking.patient.id,
      patientName: `${r.booking.patient.firstName} ${r.booking.patient.lastName}`,
      patientEmail: r.booking.patient.email,
      centerName: r.booking.diagnosticCenter.name,
      testName: (r as any).test?.name ?? null,
    }));
    return { total, data };
  }

  async getMyReports(patient: JwtRequestUser, query: BookingListQueryDto) {
    const { total, rows } = await this.repo.listPatientReports(patient.id, query);
    const data = rows.map((r) => ({
      id: r.id,
      reportFileName: r.reportFileName,
      reportToken: r.reportToken,
      reportStatus: r.reportStatus,
      deliveredAt: r.deliveredAt,
      createdAt: r.createdAt,
      bookingId: r.bookingId,
      centerName: r.booking.diagnosticCenter.name,
      testName: (r as any).test?.name ?? null,
    }));
    return { total, data };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async requireCenter(id: string) {
    const center = await this.repo.findCenterById(id);
    if (!center) throw new NotFoundException(`Diagnostic center ${id} not found.`);
    return center;
  }

  private async requireTest(id: string) {
    const test = await this.repo.findTestById(id);
    if (!test) throw new NotFoundException(`Lab test ${id} not found.`);
    return test;
  }

  private assertBookingTransition(
    current: TestBookingStatus,
    next: TestBookingStatus,
  ): void {
    const allowed = BOOKING_STATUS_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition booking from ${current} to ${next}.`,
      );
    }
  }
}
