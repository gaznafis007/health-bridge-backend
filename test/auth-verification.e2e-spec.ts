import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupSwagger } from '../src/common/swagger/swagger';
import { PrismaService } from '../src/database/prisma.service';

describe('Auth verification (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/verify/email/request requires auth', () => {
    return request(app.getHttpServer()).post('/auth/verify/email/request').expect(401);
  });

  it('POST /auth/verify/phone/request requires auth', () => {
    return request(app.getHttpServer()).post('/auth/verify/phone/request').expect(401);
  });

  it('docs-json includes telehealth routes', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const paths = Object.keys(res.body.paths ?? {});
    expect(paths.some((p) => p.includes('/telehealth'))).toBe(true);
    expect(paths.some((p) => p.includes('/reports'))).toBe(true);
    expect(paths.some((p) => p.includes('/auth/verify'))).toBe(true);
  });
});
