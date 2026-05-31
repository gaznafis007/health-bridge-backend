import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtRequestUser } from '../types/jwt-request-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtRequestUser => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtRequestUser }>();
    return req.user;
  },
);
