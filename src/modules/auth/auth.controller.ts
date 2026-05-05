/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Ip, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
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
}
