import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import {
  AUTH_ACCESS_TOKEN_TTL,
  AUTH_ALLOWED_SIGNUP_ROLES,
  AUTH_REFRESH_TOKEN_TTL_DAYS,
} from './constants/auth.constants';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthRepository } from './repositories/auth.repository';
import { AuthVerificationService } from './auth-verification.service';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly verification: AuthVerificationService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponseDto> {
    if (!AUTH_ALLOWED_SIGNUP_ROLES.includes(dto.role)) {
      throw new BadRequestException('Unsupported role for signup');
    }

    if (dto.role === UserRole.DOCTOR) {
      if (!dto.licenseNumber || !dto.specialization || !dto.qualification) {
        throw new BadRequestException(
          'Doctor signup requires licenseNumber, specialization and qualification',
        );
      }
    }

    const [existingEmail, existingPhone] = await Promise.all([
      this.authRepository.findUserByEmail(dto.email.toLowerCase().trim()),
      this.authRepository.findUserByPhone(dto.phone.trim()),
    ]);

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }
    if (existingPhone) {
      throw new ConflictException('Phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.authRepository.createUserWithProfile(
      dto,
      passwordHash,
    );

    this.verification.sendSignupVerificationEmail(
      user.id,
      user.email,
      user.firstName,
    );

    return this.issueTokens(user.id, user.role, user.email);
  }

  async signin(
    dto: SigninDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const identity = dto.identity.toLowerCase().trim();
    const user = await this.authRepository.findUserByEmailOrPhone(identity);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(
      user.id,
      user.role,
      user.email,
      userAgent,
      ipAddress,
    );
  }

  async refresh(
    dto: RefreshDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ??
      process.env.JWT_SECRET ??
      'dev-refresh-secret';

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user || user.email !== payload.email) {
      throw new UnauthorizedException('Invalid refresh token user');
    }

    const activeTokens =
      await this.authRepository.findActiveRefreshTokensForUser(user.id);

    let matchedId: string | null = null;
    for (const row of activeTokens) {
      const ok = await bcrypt.compare(dto.refreshToken, row.token);
      if (ok) {
        matchedId = row.id;
        break;
      }
    }

    if (!matchedId) {
      throw new UnauthorizedException('Refresh token revoked or not found');
    }

    await this.authRepository.revokeRefreshTokenById(matchedId);

    return this.issueTokens(
      user.id,
      user.role,
      user.email,
      userAgent,
      ipAddress,
      false,
    );
  }

  async logout(userId: string): Promise<{ success: true }> {
    await this.authRepository.revokeAllUserTokens(userId);
    return { success: true };
  }

  private getRefreshSecret(): string {
    return (
      process.env.JWT_REFRESH_SECRET ??
      process.env.JWT_SECRET ??
      'dev-refresh-secret'
    );
  }

  private async issueTokens(
    userId: string,
    role: UserRole,
    email: string,
    userAgent?: string,
    ipAddress?: string,
    revokeExisting = true,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: userId, role, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: AUTH_ACCESS_TOKEN_TTL,
    });

    const refreshPlain = await this.jwtService.signAsync(payload, {
      expiresIn: `${AUTH_REFRESH_TOKEN_TTL_DAYS}d`,
      secret: this.getRefreshSecret(),
    });

    const refreshHash = await bcrypt.hash(refreshPlain, 10);
    const expiresAt = new Date(
      Date.now() + AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    if (revokeExisting) {
      await this.authRepository.revokeAllUserTokens(userId);
    }

    await this.authRepository.storeRefreshToken(
      userId,
      refreshHash,
      expiresAt,
      userAgent,
      ipAddress,
    );

    return { accessToken, refreshToken: refreshPlain };
  }
}
