import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ECommerceController } from '../src/modules/e-commerce/e-commerce.controller';
import { ECommerceService } from '../src/modules/e-commerce/e-commerce.service';

describe('ECommerceController (e2e)', () => {
  let app: INestApplication;

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
  > = {
    createGuestSession: jest.fn(() =>
      Promise.resolve({
        sessionId: '8e42015a-42d8-4d1a-bf85-8ce120f1b5cb',
        expiresAt: '2026-05-15T10:00:00.000Z',
      }),
    ),
    listCategories: jest.fn(() => Promise.resolve([])),
    listMedicines: jest.fn(() => Promise.resolve([])),
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
    }).compile();

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
});
