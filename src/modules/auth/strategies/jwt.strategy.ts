import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authRepository: AuthRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET ?? 'dev-access-secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authRepository.findUserByEmail(payload.email);
    if (!user || user.id !== payload.sub) {
      throw new UnauthorizedException('Invalid token user');
    }
    return { id: user.id, role: user.role, email: user.email };
  }
}
