import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const repo = {
    revenueByBucket: jest.fn(),
    orderStatusCounts: jest.fn(),
    labBookingStatusCounts: jest.fn(),
    appointmentStatusCounts: jest.fn(),
    telehealthStatusCounts: jest.fn(),
    ambulanceStatusCounts: jest.fn(),
    doctorStats: jest.fn(),
    countDoctors: jest.fn(),
    countCompletedAppointments: jest.fn(),
    countCompletedTelehealth: jest.fn(),
    sumAppointmentFees: jest.fn(),
    sumTelehealthFees: jest.fn(),
    topMedicines: jest.fn(),
    topTests: jest.fn(),
  };

  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService(repo as never);
    jest.clearAllMocks();
  });

  it('rejects date range over 366 days', async () => {
    await expect(
      service.revenue({
        from: '2024-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
        granularity: 'day',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns revenue buckets as strings', async () => {
    repo.revenueByBucket.mockResolvedValue([
      {
        bucket: new Date('2026-01-01'),
        entityType: 'ORDER',
        paymentStatus: 'PAID',
        total: { toString: () => '100.00' },
        count: BigInt(2),
      },
    ]);

    const result = await service.revenue({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z',
      granularity: 'day',
    });

    expect(result.data[0]?.total).toBe('100.00');
  });
});
