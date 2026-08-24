import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SmsModule } from '../../common/sms/sms.module';
import { MailModule } from '../../common/mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthVerificationService } from './auth-verification.service';
import { AuthRepository } from './repositories/auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-access-secret',
    }),
    MailModule,
    SmsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthVerificationService, AuthRepository, JwtStrategy],
  exports: [AuthService, AuthVerificationService, JwtModule, PassportModule, JwtStrategy],
})
export class AuthModule {}
