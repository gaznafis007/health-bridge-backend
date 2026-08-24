import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthVerificationService } from './auth-verification.service';
import { AuthRepository } from './repositories/auth.repository';

describe('AuthService', () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findUserByEmailOrPhone: jest.fn(),
            findUserByEmail: jest.fn(),
            findUserByPhone: jest.fn(),
            createUserWithProfile: jest.fn(),
            storeRefreshToken: jest.fn(),
            revokeAllUserTokens: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest
              .fn()
              .mockResolvedValueOnce('access-token')
              .mockResolvedValueOnce('refresh-token')
              .mockResolvedValueOnce('access-token-2')
              .mockResolvedValueOnce('refresh-token-2'),
          },
        },
        {
          provide: AuthVerificationService,
          useValue: {
            sendSignupVerificationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repository = module.get(AuthRepository);
  });

  it('signs up patient successfully', async () => {
    repository.findUserByEmail.mockResolvedValue(null);
    repository.findUserByPhone.mockResolvedValue(null);
    repository.createUserWithProfile.mockResolvedValue({
      id: 'user-1',
      role: UserRole.PATIENT,
      email: 'user@test.com',
    } as never);
    repository.storeRefreshToken.mockResolvedValue({} as never);
    repository.revokeAllUserTokens.mockResolvedValue(undefined);

    const result = await service.signup({
      email: 'user@test.com',
      phone: '+8801700000000',
      password: 'SecurePass123',
      role: UserRole.PATIENT,
      firstName: 'User',
      lastName: 'Test',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('throws conflict on duplicate email', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 'existing' } as never);
    repository.findUserByPhone.mockResolvedValue(null);

    await expect(
      service.signup({
        email: 'user@test.com',
        phone: '+8801700000000',
        password: 'SecurePass123',
        role: UserRole.PATIENT,
        firstName: 'User',
        lastName: 'Test',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws unauthorized on invalid signin credentials', async () => {
    repository.findUserByEmailOrPhone.mockResolvedValue(null);

    await expect(
      service.signin({
        identity: 'user@test.com',
        password: 'WrongPassword123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
