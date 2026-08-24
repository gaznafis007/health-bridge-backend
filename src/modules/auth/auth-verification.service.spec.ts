import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AuthVerificationService } from './auth-verification.service';

describe('AuthVerificationService', () => {
  const authRepo = {
    findUserById: jest.fn(),
    markEmailVerified: jest.fn(),
    markPhoneVerified: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const redisKey = {
    emailVerificationJti: jest.fn((j: string) => `jti:${j}`),
    otp: jest.fn((p: string) => `otp:${p}`),
    otpAttempts: jest.fn((p: string) => `attempts:${p}`),
    otpResendCooldown: jest.fn((p: string) => `cooldown:${p}`),
    otpLockout: jest.fn((p: string) => `lockout:${p}`),
  };
  const mail = { sendEmailVerification: jest.fn() };
  const sms = { sendOtp: jest.fn() };

  let service: AuthVerificationService;

  beforeEach(() => {
    service = new AuthVerificationService(
      authRepo as never,
      jwtService as never,
      redisKey as never,
      mail as never,
      sms as never,
    );
    (service as unknown as { redis: null }).redis = null;
    jest.clearAllMocks();
  });

  it('rejects email confirm with wrong typ', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', typ: 'access', jti: 'j1' });
    await expect(service.confirmEmail('bad-token')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('phone OTP request fails closed without Redis', async () => {
    authRepo.findUserById.mockResolvedValue({
      id: 'u1',
      phone: '+8801700000001',
      phoneVerifiedAt: null,
    });
    await expect(
      service.requestPhoneOtp({ id: 'u1', email: 'a@b.com', role: 'PATIENT' } as never),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
