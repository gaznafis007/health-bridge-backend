import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { UserRole } from '@prisma/client';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { SignupDto } from '../src/modules/auth/dto/signup.dto';
import { AuthRepository } from '../src/modules/auth/repositories/auth.repository';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const users: Array<{
    id: string;
    email: string;
    phone: string;
    role: UserRole;
    passwordHash: string;
  }> = [];

  const repoMock: Pick<
    AuthRepository,
    | 'findUserByEmailOrPhone'
    | 'findUserByEmail'
    | 'findUserByPhone'
    | 'createUserWithProfile'
    | 'storeRefreshToken'
  > = {
    findUserByEmailOrPhone: jest.fn((identity: string) =>
      Promise.resolve(
        users.find((u) => u.email === identity || u.phone === identity) ?? null,
      ),
    ),
    findUserByEmail: jest.fn((email: string) =>
      Promise.resolve(users.find((u) => u.email === email) ?? null),
    ),
    findUserByPhone: jest.fn((phone: string) =>
      Promise.resolve(users.find((u) => u.phone === phone) ?? null),
    ),
    createUserWithProfile: jest.fn((dto: SignupDto, passwordHash: string) => {
      const user = {
        id: `user-${users.length + 1}`,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        role: dto.role,
        passwordHash,
      };
      users.push(user);
      return Promise.resolve(user as never);
    }),
    storeRefreshToken: jest.fn(() => Promise.resolve({} as never)),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'test-secret' }),
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: repoMock as AuthRepository,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/signup (POST) should register patient', async () => {
    const res = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/auth/signup')
      .send({
        email: 'e2e-patient@test.com',
        phone: '+8801711111111',
        password: 'SecurePass123',
        role: UserRole.PATIENT,
        firstName: 'E2E',
        lastName: 'Patient',
      })
      .expect(201);

    const body = res.body as { accessToken: string; refreshToken: string };
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('/auth/signin (POST) should reject wrong password', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/auth/signin')
      .send({
        identity: 'e2e-patient@test.com',
        password: 'WrongPassword123',
      })
      .expect(401);
  });
});
