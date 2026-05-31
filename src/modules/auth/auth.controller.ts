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
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
