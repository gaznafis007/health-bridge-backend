import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { setupSwagger } from './../src/common/swagger/swagger';
import { PrismaService } from './../src/database/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/docs-json (GET)', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/docs-json')
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: { info: { title: string }; paths: Record<string, unknown> };
        }) => {
          expect(body.info.title).toBe('Health Bridge API');
          expect(body.paths['/']).toBeDefined();
          expect(body.paths['/auth/signup']).toBeDefined();
          expect(body.paths['/auth/signin']).toBeDefined();
          expect(body.paths['/e-commerce/guest-sessions']).toBeDefined();
          expect(body.paths['/e-commerce/medicines']).toBeDefined();
          expect(body.paths['/e-commerce/checkout']).toBeDefined();
          expect(body.paths['/appointments/health-centers']).toBeDefined();
          expect(body.paths['/appointments/doctors/search']).toBeDefined();
          expect(body.paths['/appointments/doctors/{doctorUserId}']).toBeDefined();
          expect(body.paths['/appointments']).toBeDefined();
          expect(body.paths['/appointments/me/patient']).toBeDefined();
          expect(body.paths['/appointments/me/doctor']).toBeDefined();
          expect(body.paths['/appointments/me/doctor/availability']).toBeDefined();
          expect(
            body.paths['/appointments/me/doctor/availability/{availabilityId}'],
          ).toBeDefined();
          // Ambulance module routes
          expect(body.paths['/ambulance/health-centers']).toBeDefined();
          expect(body.paths['/ambulance/fleet']).toBeDefined();
          expect(body.paths['/ambulance/drivers']).toBeDefined();
          expect(body.paths['/ambulance/shifts']).toBeDefined();
          expect(body.paths['/ambulance/bookings']).toBeDefined();
          expect(body.paths['/ambulance/bookings/me']).toBeDefined();
          expect(body.paths['/ambulance/bookings/active']).toBeDefined();
          expect(body.paths['/ambulance/bookings/{bookingId}']).toBeDefined();
          expect(body.paths['/ambulance/bookings/{bookingId}/cancel']).toBeDefined();
          expect(body.paths['/ambulance/bookings/{bookingId}/dispatch']).toBeDefined();
          expect(body.paths['/ambulance/bookings/{bookingId}/arrive']).toBeDefined();
          expect(body.paths['/ambulance/bookings/{bookingId}/start']).toBeDefined();
          expect(body.paths['/ambulance/bookings/{bookingId}/complete']).toBeDefined();
          expect(body.paths['/ambulance/bookings/{bookingId}/location']).toBeDefined();
          expect(body.paths['/ambulance/bookings/{bookingId}/location/trail']).toBeDefined();
        },
      );
  });

  it('/appointments/health-centers rejects unauthenticated', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/appointments/health-centers')
      .expect(401);
  });

  it('/ambulance/health-centers rejects unauthenticated', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/ambulance/health-centers')
      .expect(401);
  });

  it('/ambulance/bookings rejects unauthenticated', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/ambulance/bookings')
      .send({})
      .expect(401);
  });

  it('/ambulance/fleet rejects unauthenticated', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/ambulance/fleet')
      .expect(401);
  });
});


