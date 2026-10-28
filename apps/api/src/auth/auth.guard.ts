import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import type { Request } from 'express';
import { SESSION_COOKIE, type AuthUser } from '../common/auth-user';
import { IS_PUBLIC, ROLES } from '../common/decorators';

interface TokenPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Sign in to continue');

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Your session has expired. Sign in again');
    }
    req.user = { id: payload.sub, role: payload.role };

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles?.length && !roles.includes(payload.role)) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const fromCookie = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (fromCookie) return fromCookie;
    const [scheme, value] = req.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' ? value : undefined;
  }
}