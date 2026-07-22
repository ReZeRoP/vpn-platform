import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  CanActivate,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface AuthUser {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
}

// @CurrentUser() -> the authenticated user attached by JwtStrategy
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// @Roles('ADMIN') on a route, enforced by RolesGuard
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'USER' | 'ADMIN'>) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Array<'USER' | 'ADMIN'>>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    return !!user && required.includes(user.role);
  }
}
