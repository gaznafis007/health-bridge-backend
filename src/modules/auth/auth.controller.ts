/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Ip, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { AuthService } from './auth.service';
import { AuthVerificationService } from './auth-verification.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { ConfirmEmailDto, ConfirmPhoneDto } from './dto/verification.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verification: AuthVerificationService,
  ) {}

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Validation or role input failed' })
  @ApiConflictResponse({ description: 'Email/phone already exists' })
  signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(dto);
  }

  @Post('signin')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email or phone and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  signin(
    @Body() dto: SigninDto,
    @Req() req,
    @Ip() ip: string,
  ): Promise<AuthResponseDto> {
    return this.authService.signin(dto, req.headers['user-agent'], ip);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked refresh token' })
  refresh(
    @Body() dto: RefreshDto,
    @Req() req,
    @Ip() ip: string,
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(dto, req.headers['user-agent'], ip);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  @ApiOkResponse({
    schema: { example: { success: true } },
  })
  @ApiUnauthorizedResponse()
  logout(@CurrentUser() user: JwtRequestUser): Promise<{ success: true }> {
    return this.authService.logout(user.id);
  }

  @Post('verify/email/request')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request email verification link' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  requestEmailVerification(@CurrentUser() user: JwtRequestUser) {
    return this.verification.requestEmailVerification(user);
  }

  @Post('verify/email/confirm')
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @ApiOperation({ summary: 'Confirm email with verification token' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  confirmEmail(@Body() dto: ConfirmEmailDto) {
    return this.verification.confirmEmail(dto.token);
  }

  @Post('verify/phone/request')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request phone OTP' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  requestPhoneOtp(@CurrentUser() user: JwtRequestUser) {
    return this.verification.requestPhoneOtp(user);
  }

  @Post('verify/phone/confirm')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm phone with OTP code' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  confirmPhoneOtp(@CurrentUser() user: JwtRequestUser, @Body() dto: ConfirmPhoneDto) {
    return this.verification.confirmPhoneOtp(user, dto.code);
  }
}
