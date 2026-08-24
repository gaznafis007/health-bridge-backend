import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import Redis from 'ioredis';
import { MailService } from '../../common/mail/mail.service';
import { RedisKeyService } from '../../common/redis/redis-key.service';
import { safeRedisClose } from '../../common/redis/safe-redis-close';
import { SMS_PROVIDER } from '../../common/sms/providers/sms-provider.interface';
import type { SmsProvider } from '../../common/sms/providers/sms-provider.interface';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { AuthRepository } from './repositories/auth.repository';

const OTP_TTL_S = 300;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_S = 900;
const OTP_RESEND_COOLDOWN_S = 60;
const EMAIL_VERIFY_TTL = '30m';

interface EmailVerifyPayload {
  sub: string;
  typ: string;
  jti: string;
}

@Injectable()
export class AuthVerificationService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthVerificationService.name);
  private readonly redis: Redis | null;

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly redisKey: RedisKeyService,
    private readonly mail: MailService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {
    const redisUrl = process.env.REDIS_URL;
    this.redis =
      redisUrl
        ? new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          })
        : null;
  }

  async onModuleDestroy() {
    await safeRedisClose(this.redis);
  }

  async requestEmailVerification(user: JwtRequestUser): Promise<{ success: true }> {
    const dbUser = await this.authRepo.findUserById(user.id);
    if (!dbUser) throw new UnauthorizedException();
    if (dbUser.emailVerifiedAt) {
      return { success: true };
    }

    const secret = this.getVerificationSecret();
    const jti = randomUUID();
    const token = await this.jwtService.signAsync(
      { sub: user.id, typ: 'email_verify', jti },
      { secret, expiresIn: EMAIL_VERIFY_TTL },
    );

    const appUrl = (process.env.APP_URL ?? 'http://localhost:5000').replace(/\/$/, '');
    const verifyUrl = `${appUrl}/auth/verify/email/confirm?token=${encodeURIComponent(token)}`;

    await this.mail.sendEmailVerification({
      to: dbUser.email,
      firstName: dbUser.firstName,
      verifyUrl,
    });

    return { success: true };
  }

  sendSignupVerificationEmail(userId: string, email: string, firstName: string): void {
    void this.requestEmailVerification({ id: userId, email, role: 'PATIENT' } as JwtRequestUser).catch(
      (err: Error) => this.logger.warn(`Signup verification email failed: ${err.message}`),
    );
  }

  async confirmEmail(token: string): Promise<{ success: true }> {
    const secret = this.getVerificationSecret();
    let payload: EmailVerifyPayload;
    try {
      payload = await this.jwtService.verifyAsync<EmailVerifyPayload>(token, { secret });
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (payload.typ !== 'email_verify') {
      throw new BadRequestException('Invalid verification token type');
    }

    const user = await this.authRepo.findUserById(payload.sub);
    if (!user) throw new BadRequestException('Invalid verification token');
    if (user.emailVerifiedAt) {
      return { success: true };
    }

    if (this.redis) {
      const used = await this.redis.get(this.redisKey.emailVerificationJti(payload.jti));
      if (used) {
        throw new BadRequestException('Verification token already used');
      }
      await this.redis.setex(this.redisKey.emailVerificationJti(payload.jti), 86400, '1');
    }

    await this.authRepo.markEmailVerified(user.id);
    return { success: true };
  }

  async requestPhoneOtp(user: JwtRequestUser): Promise<{ success: true }> {
    this.requireRedis();
    const dbUser = await this.authRepo.findUserById(user.id);
    if (!dbUser) throw new UnauthorizedException();
    if (dbUser.phoneVerifiedAt) {
      return { success: true };
    }

    const cooldownKey = this.redisKey.otpResendCooldown(dbUser.phone);
    const onCooldown = await this.redis!.get(cooldownKey);
    if (onCooldown) {
      throw new BadRequestException('Please wait before requesting another code');
    }

    const lockoutKey = this.redisKey.otpLockout(dbUser.phone);
    const locked = await this.redis!.get(lockoutKey);
    if (locked) {
      throw new BadRequestException('Too many attempts. Try again later.');
    }

    const code = randomInt(100000, 999999).toString();
    const hashed = this.hashOtp(dbUser.phone, code);
    await this.redis!.setex(this.redisKey.otp(dbUser.phone), OTP_TTL_S, hashed);
    await this.redis!.setex(cooldownKey, OTP_RESEND_COOLDOWN_S, '1');
    await this.redis!.del(this.redisKey.otpAttempts(dbUser.phone));

    await this.sms.sendOtp(dbUser.phone, `Your Health Bridge verification code is ${code}`);

    return { success: true };
  }

  async confirmPhoneOtp(user: JwtRequestUser, code: string): Promise<{ success: true }> {
    this.requireRedis();
    const dbUser = await this.authRepo.findUserById(user.id);
    if (!dbUser) throw new UnauthorizedException();
    if (dbUser.phoneVerifiedAt) {
      return { success: true };
    }

    const lockoutKey = this.redisKey.otpLockout(dbUser.phone);
    const locked = await this.redis!.get(lockoutKey);
    if (locked) {
      throw new BadRequestException('Too many attempts. Try again later.');
    }

    const stored = await this.redis!.get(this.redisKey.otp(dbUser.phone));
    if (!stored) {
      throw new BadRequestException('Invalid or expired code');
    }

    const candidate = this.hashOtp(dbUser.phone, code);
    const valid = this.safeCompare(stored, candidate);
    if (!valid) {
      const attemptsKey = this.redisKey.otpAttempts(dbUser.phone);
      const attempts = await this.redis!.incr(attemptsKey);
      if (attempts === 1) {
        await this.redis!.expire(attemptsKey, OTP_TTL_S);
      }
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.redis!.setex(lockoutKey, OTP_LOCKOUT_S, '1');
        await this.redis!.del(this.redisKey.otp(dbUser.phone));
      }
      throw new BadRequestException('Invalid or expired code');
    }

    await this.redis!.del(this.redisKey.otp(dbUser.phone));
    await this.redis!.del(this.redisKey.otpAttempts(dbUser.phone));
    await this.authRepo.markPhoneVerified(dbUser.id);

    return { success: true };
  }

  private requireRedis() {
    if (!this.redis) {
      throw new ServiceUnavailableException('Verification service temporarily unavailable');
    }
  }

  private getVerificationSecret(): string {
    const secret = process.env.VERIFICATION_TOKEN_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Verification not configured');
      }
      return process.env.JWT_SECRET ?? 'dev-verification-secret';
    }
    return secret;
  }

  private hashOtp(phone: string, code: string): string {
    const pepper = process.env.OTP_PEPPER ?? this.getVerificationSecret();
    return createHmac('sha256', pepper).update(`${phone}:${code}`).digest('hex');
  }

  private safeCompare(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  }
}
