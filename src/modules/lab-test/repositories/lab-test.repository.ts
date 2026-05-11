import { Injectable } from '@nestjs/common';
import {
  PaymentEntityType,
  PaymentGateway,
  PaymentMethodType,
  PaymentStatus,
  Prisma,
  ReportStatus,
  SampleStatus,
  TestBookingStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AdminReportListQueryDto, BookingListQueryDto } from '../dto/lab-test-request.dto';

@Injectable()
export class LabTestRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Diagnostic Centers ───────────────────────────────────────────────────

  listCenters() {
    return this.prisma.diagnosticCenter.findMany({ orderBy: { name: 'asc' } });
  }

  findCenterById(id: string) {
    return this.prisma.diagnosticCenter.findUnique({ where: { id } });
  }

  createCenter(data: Prisma.DiagnosticCenterCreateInput) {
    return this.prisma.diagnosticCenter.create({ data });
  }

  // ─── Lab Tests ────────────────────────────────────────────────────────────

  listTestsByCenter(centerId: string) {
    return this.prisma.labTest.findMany({
      where: { diagnosticCenterId: centerId },
      orderBy: { name: 'asc' },
    });
  }

  findTestById(id: string) {
    return this.prisma.labTest.findUnique({ where: { id } });
  }

  createTest(centerId: string, data: Omit<Prisma.LabTestCreateInput, 'diagnosticCenter'>) {
    return this.prisma.labTest.create({
      data: {
        ...data,
        diagnosticCenter: { connect: { id: centerId } },
      },
    });
  }

  updateTest(id: string, data: Prisma.LabTestUpdateInput) {
    return this.prisma.labTest.update({ where: { id }, data });
  }

  searchTestsByName(params: {
    name?: string;
    code?: string;
    centerId?: string;
    city?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.LabTestWhereInput = {
      ...(params.name
        ? { name: { contains: params.name, mode: 'insensitive' } }
        : {}),
      ...(params.code
        ? { code: { contains: params.code, mode: 'insensitive' } }
        : {}),
      ...(params.centerId ? { diagnosticCenterId: params.centerId } : {}),
      ...(params.city
        ? { diagnosticCenter: { city: { contains: params.city, mode: 'insensitive' } } }
        : {}),
    };

    return this.prisma.labTest.findMany({
      where,
      include: { diagnosticCenter: { select: { id: true, name: true, city: true } } },
      skip: params.skip ?? 0,
      take: params.take ?? 20,
      orderBy: { name: 'asc' },
    });
  }

  // ─── Test Packages ────────────────────────────────────────────────────────

  listPackagesByCenter(centerId: string) {
    return this.prisma.testPackage.findMany({
      where: { diagnosticCenterId: centerId },
      include: { items: { include: { test: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findPackageWithItems(id: string) {
    return this.prisma.testPackage.findUnique({
      where: { id },
      include: { items: { include: { test: true } } },
    });
  }

  createPackage(
    centerId: string,
    data: Omit<Prisma.TestPackageCreateInput, 'diagnosticCenter' | 'items'>,
    testIds: string[],
  ) {
    return this.prisma.testPackage.create({
      data: {
        ...data,
        diagnosticCenter: { connect: { id: centerId } },
        items: {
          create: testIds.map((testId) => ({ test: { connect: { id: testId } } })),
        },
      },
      include: { items: { include: { test: true } } },
    });
  }

  updatePackage(id: string, data: Prisma.TestPackageUpdateInput) {
    return this.prisma.testPackage.update({ where: { id }, data });
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  async createBookingWithItems(params: {
    patientId: string;
    diagnosticCenterId: string;
    sampleCollectionDate: Date;
    sampleCollectionTime: string;
    paymentMethod: string;
    notes?: string;
    totalAmount: Prisma.Decimal;
    items: Array<{ testId?: string; packageId?: string; price: Prisma.Decimal }>;
  }) {
    const methodType =
      params.paymentMethod.toUpperCase() === 'CASH'
        ? PaymentMethodType.CASH
        : PaymentMethodType.ONLINE;

    const paymentStatus =
      methodType === PaymentMethodType.CASH
        ? PaymentStatus.PENDING_CASH
        : PaymentStatus.PENDING;

    return this.prisma.$transaction(async (tx) => {
      // Create a temporary booking id placeholder to link payment ↔ booking
      const tempBookingId = require('crypto').randomUUID() as string;

      const payment = await tx.payment.create({
        data: {
          entityType: PaymentEntityType.TEST_BOOKING,
          entityId: tempBookingId,
          amount: params.totalAmount,
          paymentMethod: methodType,
          paymentStatus,
          paymentGateway: PaymentGateway.MANUAL,
          userId: params.patientId,
        },
      });

      const booking = await tx.testBooking.create({
        data: {
          patientId: params.patientId,
          diagnosticCenterId: params.diagnosticCenterId,
          bookingDate: new Date(),
          sampleCollectionDate: params.sampleCollectionDate,
          sampleCollectionTime: params.sampleCollectionTime,
          totalAmount: params.totalAmount,
          notes: params.notes,
          paymentId: payment.id,
          items: {
            create: params.items.map((item) => ({
              testId: item.testId ?? null,
              packageId: item.packageId ?? null,
              price: item.price,
            })),
          },
        },
        include: { items: true },
      });

      // Update payment entityId to the real booking id
      await tx.payment.update({
        where: { id: payment.id },
        data: { entityId: booking.id },
      });

      return { booking, payment };
    });
  }

  findBookingById(id: string) {
    return this.prisma.testBooking.findUnique({
      where: { id },
      include: {
        items: true,
        diagnosticCenter: true,
        patient: { select: { id: true, email: true, firstName: true, lastName: true } },
        payment: true,
        reports: true,
      },
    });
  }

  listPatientBookings(patientId: string, query: BookingListQueryDto) {
    return this.prisma.testBooking.findMany({
      where: { patientId },
      include: { items: true, diagnosticCenter: { select: { id: true, name: true } } },
      orderBy: { bookingDate: 'desc' },
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    });
  }

  countPatientBookings(patientId: string) {
    return this.prisma.testBooking.count({ where: { patientId } });
  }

  listAllBookings(query: BookingListQueryDto) {
    return this.prisma.testBooking.findMany({
      include: {
        items: true,
        diagnosticCenter: { select: { id: true, name: true } },
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        payment: true,
      },
      orderBy: { bookingDate: 'desc' },
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    });
  }

  countAllBookings() {
    return this.prisma.testBooking.count();
  }

  updateBookingStatus(
    id: string,
    bookingStatus: TestBookingStatus,
    extra?: Partial<{
      cancelledAt: Date;
      cancellationReason: string;
      completedAt: Date;
    }>,
  ) {
    return this.prisma.testBooking.update({
      where: { id },
      data: { bookingStatus, ...extra },
    });
  }

  updateSampleStatus(
    id: string,
    sampleStatus: SampleStatus,
    extra?: Partial<{ sampleCollectedAt: Date }>,
  ) {
    return this.prisma.testBooking.update({
      where: { id },
      data: { sampleStatus, ...extra },
    });
  }

  confirmBookingPayment(id: string, paymentId: string, transactionId?: string) {
    return this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          ...(transactionId ? { transactionId } : {}),
          paidAt: new Date(),
        },
      }),
      this.prisma.testBooking.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          bookingStatus: TestBookingStatus.CONFIRMED,
        },
      }),
    ]);
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  createReport(data: {
    bookingId: string;
    testId?: string | null;
    reportToken: string;
    reportUrl: string;
    reportFileName: string;
  }) {
    return this.prisma.testReport.create({
      data: {
        bookingId: data.bookingId,
        testId: data.testId ?? null,
        reportToken: data.reportToken,
        reportUrl: data.reportUrl,
        reportFileName: data.reportFileName,
        reportStatus: ReportStatus.READY,
      },
    });
  }

  findReportById(id: string) {
    return this.prisma.testReport.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            patient: { select: { id: true, email: true, firstName: true, lastName: true } },
            diagnosticCenter: { select: { id: true, name: true } },
          },
        },
        test: { select: { id: true, name: true } },
      },
    });
  }

  findReportByToken(token: string) {
    return this.prisma.testReport.findUnique({ where: { reportToken: token } });
  }

  listReportsByBooking(bookingId: string) {
    return this.prisma.testReport.findMany({
      where: { bookingId },
      include: { test: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateReportStatus(
    id: string,
    reportStatus: ReportStatus,
    extra?: Partial<{ deliveredAt: Date; generatedAt: Date }>,
  ) {
    return this.prisma.testReport.update({
      where: { id },
      data: { reportStatus, ...extra },
    });
  }

  countUndeliveredReports(bookingId: string) {
    return this.prisma.testReport.count({
      where: {
        bookingId,
        reportStatus: { notIn: [ReportStatus.DELIVERED, ReportStatus.ARCHIVED] },
      },
    });
  }

  async listAllReports(query: AdminReportListQueryDto) {
    const where: Prisma.TestReportWhereInput = {
      ...(query.reportStatus ? { reportStatus: query.reportStatus } : {}),
      booking: {
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.diagnosticCenterId
          ? { diagnosticCenterId: query.diagnosticCenterId }
          : {}),
        ...(query.bookingStatus ? { bookingStatus: query.bookingStatus } : {}),
        ...(query.fromDate || query.toDate
          ? {
              createdAt: {
                ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
                ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
              },
            }
          : {}),
      },
    };

    const [total, rows] = await Promise.all([
      this.prisma.testReport.count({ where }),
      this.prisma.testReport.findMany({
        where,
        include: {
          booking: {
            include: {
              patient: { select: { id: true, firstName: true, lastName: true, email: true } },
              diagnosticCenter: { select: { id: true, name: true } },
            },
          },
          test: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip ?? 0,
        take: query.take ?? 20,
      }),
    ]);

    return { total, rows };
  }

  async listPatientReports(patientId: string, query: BookingListQueryDto) {
    const where: Prisma.TestReportWhereInput = {
      booking: { patientId },
    };

    const [total, rows] = await Promise.all([
      this.prisma.testReport.count({ where }),
      this.prisma.testReport.findMany({
        where,
        include: {
          booking: {
            include: {
              diagnosticCenter: { select: { id: true, name: true } },
            },
          },
          test: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip ?? 0,
        take: query.take ?? 20,
      }),
    ]);

    return { total, rows };
  }
}
