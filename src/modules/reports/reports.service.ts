import { BadRequestException, Injectable } from '@nestjs/common';
import { REPORTS_MAX_RANGE_DAYS, REPORTS_MAX_TAKE } from './constants/reports.constants';
import {
  DateRangeQueryDto,
  PaginatedReportQueryDto,
  RevenueQueryDto,
} from './dto/reports-query.dto';
import { ReportsRepository } from './repositories/reports.repository';

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/^[=+\-@]/.test(s)) {
    return `'${s.replace(/'/g, "''")}`;
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async revenue(query: RevenueQueryDto) {
    const { from, to } = this.parseRange(query);
    const granularity = query.granularity ?? 'day';
    const rows = await this.repo.revenueByBucket(from, to, granularity);
    const data = rows.map((r) => ({
      bucket: r.bucket.toISOString(),
      entityType: r.entityType,
      paymentStatus: r.paymentStatus,
      total: r.total.toString(),
      count: Number(r.count),
    }));
    if (query.format === 'csv') {
      return this.toCsv(
        ['bucket', 'entityType', 'paymentStatus', 'total', 'count'],
        data.map((d) => [d.bucket, d.entityType, d.paymentStatus, d.total, d.count]),
      );
    }
    return { from: from.toISOString(), to: to.toISOString(), granularity, data };
  }

  async operations(query: DateRangeQueryDto) {
    const { from, to } = this.parseRange(query);
    const [orders, lab, appointments, telehealth, ambulance] = await Promise.all([
      this.repo.orderStatusCounts(from, to),
      this.repo.labBookingStatusCounts(from, to),
      this.repo.appointmentStatusCounts(from, to),
      this.repo.telehealthStatusCounts(from, to),
      this.repo.ambulanceStatusCounts(from, to),
    ]);
    const payload = {
      from: from.toISOString(),
      to: to.toISOString(),
      orders: orders.map((o) => ({ status: o.deliveryStatus, count: o._count })),
      labBookings: lab.map((l) => ({ status: l.bookingStatus, count: l._count })),
      appointments: appointments.map((a) => ({ status: a.status, count: a._count })),
      telehealth: telehealth.map((t) => ({ status: t.status, count: t._count })),
      ambulance: ambulance.map((a) => ({ status: a.status, count: a._count })),
    };
    if (query.format === 'csv') {
      const rows: Array<Array<string | number>> = [];
      for (const [domain, items] of Object.entries({
        orders: payload.orders,
        labBookings: payload.labBookings,
        appointments: payload.appointments,
        telehealth: payload.telehealth,
        ambulance: payload.ambulance,
      })) {
        for (const item of items as Array<{ status: string; count: number }>) {
          rows.push([domain, item.status, item.count]);
        }
      }
      return this.toCsv(['domain', 'status', 'count'], rows);
    }
    return payload;
  }

  async doctors(query: PaginatedReportQueryDto) {
    const { from, to } = this.parseRange(query);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 20, REPORTS_MAX_TAKE);
    const [doctors, total] = await Promise.all([
      this.repo.doctorStats(from, to, skip, take),
      this.repo.countDoctors(),
    ]);

    const items = await Promise.all(
      doctors.map(async (d) => {
        const [appts, tele, apptFees, teleFees] = await Promise.all([
          this.repo.countCompletedAppointments(d.userId, from, to),
          this.repo.countCompletedTelehealth(d.userId, from, to),
          this.repo.sumAppointmentFees(d.userId, from, to),
          this.repo.sumTelehealthFees(d.userId, from, to),
        ]);
        const fees =
          Number(apptFees._sum.consultationFee ?? 0) +
          Number(teleFees._sum.consultationFee ?? 0);
        return {
          doctorId: d.userId,
          name: `${d.user.firstName} ${d.user.lastName}`,
          specialization: d.specialization,
          rating: d.rating,
          totalRatings: d.totalRatings,
          completedAppointments: appts,
          completedTelehealth: tele,
          feesEarned: fees.toFixed(2),
        };
      }),
    );

    return { from: from.toISOString(), to: to.toISOString(), items, total, skip, take };
  }

  async topMedicines(query: PaginatedReportQueryDto) {
    const { from, to } = this.parseRange(query);
    const take = Math.min(query.take ?? 20, REPORTS_MAX_TAKE);
    const rows = await this.repo.topMedicines(from, to, take);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      items: rows.map((r) => ({
        medicineId: r.medicineId,
        quantity: r._sum.quantity ?? 0,
        revenue: (r._sum.totalPrice ?? 0).toString(),
      })),
    };
  }

  async topTests(query: PaginatedReportQueryDto) {
    const { from, to } = this.parseRange(query);
    const take = Math.min(query.take ?? 20, REPORTS_MAX_TAKE);
    const rows = await this.repo.topTests(from, to, take);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      items: rows.map((r) => ({
        testId: r.testId,
        bookings: r._count,
      })),
    };
  }

  private parseRange(query: { from: string; to: string }) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (to <= from) {
      throw new BadRequestException('"to" must be after "from"');
    }
    const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (days > REPORTS_MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${REPORTS_MAX_RANGE_DAYS} days`);
    }
    return { from, to };
  }

  private toCsv(headers: string[], rows: Array<Array<string | number>>) {
    const lines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((r) => r.map(escapeCsvCell).join(',')),
    ];
    return { csv: lines.join('\n'), contentType: 'text/csv' as const };
  }
}
