import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderPaymentMethod, OrderPaymentStatus, Prisma } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { ECommerceRepository } from './repositories/e-commerce.repository';
import { ECommerceService } from './e-commerce.service';
import { ECommerceStoreService } from './e-commerce-store.service';

describe('ECommerceService', () => {
  let service: ECommerceService;
  let repository: jest.Mocked<ECommerceRepository>;
  let store: jest.Mocked<ECommerceStoreService>;

  const guestSession = {
    id: 'guest-id',
    sessionId: '8e42015a-42d8-4d1a-bf85-8ce120f1b5cb',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ECommerceService,
        {
          provide: ECommerceRepository,
          useValue: {
            createGuestSession: jest.fn(),
            findCategories: jest.fn(),
            findMedicines: jest.fn(),
            findGuestSessionBySessionId: jest.fn(),
            touchGuestSession: jest.fn(),
            findMedicinesByIds: jest.fn(),
            checkoutOrder: jest.fn(),
            findOrderById: jest.fn(),
            listOrdersByDeliveryPhone: jest.fn(),
          },
        },
        {
          provide: ECommerceStoreService,
          useValue: {
            getCart: jest.fn(),
            setCart: jest.fn(),
            deleteCart: jest.fn(),
            getIdempotency: jest.fn(),
            setIdempotency: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: { enqueue: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ECommerceService);
    repository = module.get(ECommerceRepository);
    store = module.get(ECommerceStoreService);

    repository.findGuestSessionBySessionId.mockResolvedValue(guestSession as never);
    repository.touchGuestSession.mockResolvedValue({
      ...guestSession,
      expiresAt: new Date(Date.now() + 60_000),
    } as never);
    store.getIdempotency.mockResolvedValue(null);
  });

  it('checks out a guest medicine cart successfully', async () => {
    store.getCart.mockResolvedValue({
      items: {
        '1fca6552-e2b2-4325-a45f-81418ab4a7d0': 2,
      },
      updatedAt: new Date().toISOString(),
    });
    repository.findMedicinesByIds.mockResolvedValue([
      {
        id: '1fca6552-e2b2-4325-a45f-81418ab4a7d0',
        name: 'Napa',
        genericName: 'Paracetamol',
        manufacturer: 'Beximco',
        categoryId: '4fc9b7c4-ece7-4c3f-a778-a6adccaf7347',
        price: new Prisma.Decimal('12.50'),
        stockQuantity: 10,
        requiresPrescription: false,
        status: 'ACTIVE',
        category: { id: '4fc9b7c4-ece7-4c3f-a778-a6adccaf7347', name: 'Pain Relief' },
      },
    ] as never);
    repository.checkoutOrder.mockResolvedValue({
      id: 'f8de4c23-4a58-405f-ae0f-0de82a4f65cb',
      userId: null,
      guestSessionId: guestSession.sessionId,
      totalAmount: new Prisma.Decimal('25.00'),
      discountAmount: new Prisma.Decimal('0.00'),
      taxAmount: new Prisma.Decimal('0.00'),
      finalAmount: new Prisma.Decimal('25.00'),
      paymentMethod: OrderPaymentMethod.CASH,
      paymentStatus: OrderPaymentStatus.PENDING_CASH,
      deliveryStatus: 'PENDING',
      deliveryAddress: 'House 10, Dhaka',
      deliveryPhone: '+8801700000000',
      createdAt: new Date('2026-05-08T10:00:00.000Z'),
      items: [
        {
          medicineId: '1fca6552-e2b2-4325-a45f-81418ab4a7d0',
          quantity: 2,
          unitPrice: new Prisma.Decimal('12.50'),
          totalPrice: new Prisma.Decimal('25.00'),
          medicine: { name: 'Napa' },
        },
      ],
    } as never);

    const result = await service.checkout({
      guestSessionId: guestSession.sessionId,
      paymentMethod: OrderPaymentMethod.CASH,
      deliveryAddress: 'House 10, Dhaka',
      deliveryPhone: '+8801700000000',
      idempotencyKey: 'guest-checkout-0001',
    });

    expect(result.id).toBe('f8de4c23-4a58-405f-ae0f-0de82a4f65cb');
    expect(result.finalAmount).toBe('25.00');
    expect(store.deleteCart).toHaveBeenCalledWith(guestSession.sessionId);
    expect(store.setIdempotency).toHaveBeenCalled();
  });

  it('rejects checkout when the cart is empty', async () => {
    store.getCart.mockResolvedValue({
      items: {},
      updatedAt: new Date().toISOString(),
    });

    await expect(
      service.checkout({
        guestSessionId: guestSession.sessionId,
        paymentMethod: OrderPaymentMethod.ONLINE,
        deliveryAddress: 'House 10, Dhaka',
        deliveryPhone: '+8801700000000',
        idempotencyKey: 'guest-checkout-0002',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns paginated medicines with mapped fields', async () => {
    repository.findMedicines.mockResolvedValue([
      [
        {
          id: '1fca6552-e2b2-4325-a45f-81418ab4a7d0',
          categoryId: '4fc9b7c4-ece7-4c3f-a778-a6adccaf7347',
          name: 'Napa',
          genericName: 'Paracetamol',
          manufacturer: 'Beximco',
          price: new Prisma.Decimal('12.50'),
          stockQuantity: 10,
          requiresPrescription: false,
          status: 'ACTIVE',
          category: { id: '4fc9b7c4-ece7-4c3f-a778-a6adccaf7347', name: 'Pain Relief' },
        },
      ],
      1,
    ] as never);

    const result = await service.listMedicines({ skip: 0, take: 20 });

    expect(repository.findMedicines).toHaveBeenCalledWith({
      categoryId: undefined,
      search: undefined,
      requiresPrescription: undefined,
      inStockOnly: true,
      skip: 0,
      take: 20,
    });
    expect(result).toEqual({
      items: [
        {
          id: '1fca6552-e2b2-4325-a45f-81418ab4a7d0',
          categoryId: '4fc9b7c4-ece7-4c3f-a778-a6adccaf7347',
          categoryName: 'Pain Relief',
          name: 'Napa',
          genericName: 'Paracetamol',
          manufacturer: 'Beximco',
          price: '12.50',
          stockQuantity: 10,
          requiresPrescription: false,
          status: 'ACTIVE',
        },
      ],
      total: 1,
      skip: 0,
      take: 20,
    });
  });

  it('returns orders matching delivery phone', async () => {
    repository.listOrdersByDeliveryPhone.mockResolvedValue([
      [
        {
          id: 'f8de4c23-4a58-405f-ae0f-0de82a4f65cb',
          userId: null,
          guestSessionId: guestSession.sessionId,
          totalAmount: new Prisma.Decimal('25.00'),
          discountAmount: new Prisma.Decimal('0.00'),
          taxAmount: new Prisma.Decimal('0.00'),
          finalAmount: new Prisma.Decimal('25.00'),
          paymentMethod: OrderPaymentMethod.CASH,
          paymentStatus: OrderPaymentStatus.PENDING_CASH,
          deliveryStatus: 'PENDING',
          deliveryAddress: 'House 10, Dhaka',
          deliveryPhone: '+8801700000000',
          createdAt: new Date('2026-05-08T10:00:00.000Z'),
          items: [
            {
              medicineId: '1fca6552-e2b2-4325-a45f-81418ab4a7d0',
              quantity: 2,
              unitPrice: new Prisma.Decimal('12.50'),
              totalPrice: new Prisma.Decimal('25.00'),
              medicine: { name: 'Napa' },
            },
          ],
        },
      ],
      1,
    ] as never);

    const result = await service.trackOrdersByPhone({
      deliveryPhone: '+8801700000000',
      skip: 0,
      take: 20,
    });

    expect(repository.listOrdersByDeliveryPhone).toHaveBeenCalledWith(
      '+8801700000000',
      0,
      20,
    );
    expect(result.total).toBe(1);
    expect(result.items[0].deliveryPhone).toBe('+8801700000000');
  });

  it('returns order detail for authenticated patient', async () => {
    const order = {
      id: 'f8de4c23-4a58-405f-ae0f-0de82a4f65cb',
      userId: 'patient-id',
      guestSessionId: guestSession.sessionId,
      totalAmount: new Prisma.Decimal('25.00'),
      discountAmount: new Prisma.Decimal('0.00'),
      taxAmount: new Prisma.Decimal('0.00'),
      finalAmount: new Prisma.Decimal('25.00'),
      paymentMethod: OrderPaymentMethod.CASH,
      paymentStatus: OrderPaymentStatus.PENDING_CASH,
      deliveryStatus: 'PENDING',
      deliveryAddress: 'House 10, Dhaka',
      deliveryPhone: '+8801700000000',
      createdAt: new Date('2026-05-08T10:00:00.000Z'),
      items: [
        {
          medicineId: '1fca6552-e2b2-4325-a45f-81418ab4a7d0',
          quantity: 2,
          unitPrice: new Prisma.Decimal('12.50'),
          totalPrice: new Prisma.Decimal('25.00'),
          medicine: { name: 'Napa' },
        },
      ],
    };

    repository.findOrderById.mockResolvedValue(order as never);

    const result = await service.getMyOrder(
      { id: 'patient-id', role: 'PATIENT', email: 'patient@test.com' } as never,
      order.id,
    );

    expect(result.id).toBe(order.id);
    expect(result.items).toHaveLength(1);
  });

  it('returns not found when order does not belong to patient', async () => {
    repository.findOrderById.mockResolvedValue({
      id: 'f8de4c23-4a58-405f-ae0f-0de82a4f65cb',
      userId: 'other-patient-id',
    } as never);

    await expect(
      service.getMyOrder(
        { id: 'patient-id', role: 'PATIENT', email: 'patient@test.com' } as never,
        'f8de4c23-4a58-405f-ae0f-0de82a4f65cb',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
