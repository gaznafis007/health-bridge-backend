import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ECommerceController } from '../src/modules/e-commerce/e-commerce.controller';
import { ECommerceService } from '../src/modules/e-commerce/e-commerce.service';

describe('ECommerceController (e2e)', () => {
  let app: INestApplication;

  const paginatedMedicines = {
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
    take: 10,
  };

  const ecommerceServiceMock: Pick<
    ECommerceService,
    | 'createGuestSession'
    | 'listCategories'
    | 'listMedicines'
    | 'getCart'
    | 'upsertCartItem'
    | 'removeCartItem'
    | 'checkout'
    | 'getOrder'
    | 'trackOrdersByPhone'
    | 'listAdminOrders'
  > = {
    createGuestSession: jest.fn(() =>
      Promise.resolve({
        sessionId: '8e42015a-42d8-4d1a-bf85-8ce120f1b5cb',
        expiresAt: '2026-05-15T10:00:00.000Z',
      }),
    ),
    listCategories: jest.fn(() => Promise.resolve([])),
    listMedicines: jest.fn(() => Promise.resolve(paginatedMedicines)),
    getCart: jest.fn(),
    upsertCartItem: jest.fn((dto) =>
      Promise.resolve({
        guestSessionId: dto.guestSessionId,
        items: [
          {
            medicineId: dto.medicineId,
            medicineName: 'Napa',
            genericName: 'Paracetamol',
            quantity: dto.quantity,
            unitPrice: '12.50',
            totalPrice: '25.00',
            requiresPrescription: false,
          },
        ],
        totalItems: dto.quantity,
        subtotal: '25.00',
        expiresAt: '2026-05-15T10:00:00.000Z',
      }),
    ),
    removeCartItem: jest.fn(),
    checkout: jest.fn(),
    getOrder: jest.fn(),
    trackOrdersByPhone: jest.fn(() =>
      Promise.resolve({
        items: [
          {
            id: 'f8de4c23-4a58-405f-ae0f-0de82a4f65cb',
            userId: null,
            guestSessionId: '8e42015a-42d8-4d1a-bf85-8ce120f1b5cb',
            totalAmount: '25.00',
            discountAmount: '0.00',
            taxAmount: '0.00',
            finalAmount: '25.00',
            paymentMethod: 'CASH',
            paymentStatus: 'PENDING_CASH',
            deliveryStatus: 'PENDING',
            deliveryAddress: 'House 10, Dhaka',
            deliveryPhone: '+8801700000000',
            createdAt: '2026-05-08T10:00:00.000Z',
            items: [
              {
                medicineId: '1fca6552-e2b2-4325-a45f-81418ab4a7d0',
                medicineName: 'Napa',
                quantity: 2,
                unitPrice: '12.50',
                totalPrice: '25.00',
              },
            ],
          },
        ],
        total: 1,
        skip: 0,
        take: 20,
      }),
    ),
    listAdminOrders: jest.fn(() =>
      Promise.resolve({
        items: [
          {
            id: 'f8de4c23-4a58-405f-ae0f-0de82a4f65cb',
            userId: '00000000-0000-4000-8000-000000000105',
            guestSessionId: '8e42015a-42d8-4d1a-bf85-8ce120f1b5cb',
            totalAmount: '25.00',
            discountAmount: '0.00',
            taxAmount: '0.00',
            finalAmount: '25.00',
            paymentMethod: 'CASH',
            paymentStatus: 'PENDING_CASH',
            deliveryStatus: 'PENDING',
            deliveryAddress: 'House 10, Dhaka',
            deliveryPhone: '+8801700000000',
            customerEmail: 'patient1@healthbridge.dev',
            createdAt: '2026-05-08T10:00:00.000Z',
            items: [],
          },
        ],
        total: 1,
        skip: 0,
        take: 20,
      }),
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ECommerceController],
      providers: [
        {
          provide: ECommerceService,
          useValue: ecommerceServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/e-commerce/guest-sessions (POST) should create a guest session', async () => {
    const res = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/e-commerce/guest-sessions')
      .expect(201);

    expect(res.body.sessionId).toBe('8e42015a-42d8-4d1a-bf85-8ce120f1b5cb');
  });

  it('/e-commerce/medicines (GET) should return paginated medicines', async () => {
    const res = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/e-commerce/medicines?skip=0&take=10')
      .expect(200);

    expect(res.body).toEqual(paginatedMedicines);
    expect(ecommerceServiceMock.listMedicines).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
  });

  it('/e-commerce/medicines (GET) should reject invalid take', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/e-commerce/medicines?take=0')
      .expect(400);
  });

  it('/e-commerce/cart/items (PUT) should reject invalid quantity', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .put('/e-commerce/cart/items')
      .send({
        guestSessionId: '8e42015a-42d8-4d1a-bf85-8ce120f1b5cb',
        medicineId: '1fca6552-e2b2-4325-a45f-81418ab4a7d0',
        quantity: 0,
      })
      .expect(400);
  });

  it('/e-commerce/orders/by-phone (GET) should return orders for delivery phone', async () => {
    const res = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/e-commerce/orders/by-phone')
      .query({ deliveryPhone: '+8801700000000', skip: 0, take: 20 })
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].deliveryPhone).toBe('+8801700000000');
    expect(ecommerceServiceMock.trackOrdersByPhone).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryPhone: '+8801700000000',
        skip: 0,
        take: 20,
      }),
    );
  });

  it('/e-commerce/orders/by-phone (GET) should reject invalid phone', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/e-commerce/orders/by-phone')
      .query({ deliveryPhone: 'invalid' })
      .expect(400);
  });

  it('/e-commerce/admin/orders (GET) should return paginated admin orders', async () => {
    const res = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/e-commerce/admin/orders')
      .query({ email: 'patient1', phone: '8801700', skip: 0, take: 20 })
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].customerEmail).toBe('patient1@healthbridge.dev');
    expect(ecommerceServiceMock.listAdminOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'patient1',
        phone: '8801700',
        skip: 0,
        take: 20,
      }),
    );
  });
});
