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
        },
      );
  });
});
