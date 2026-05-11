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
        },
      );
  });

  it('/appointments/health-centers rejects unauthenticated', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/appointments/health-centers')
      .expect(401);
  });
});


