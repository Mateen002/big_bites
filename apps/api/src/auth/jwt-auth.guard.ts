import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class AdminAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { role?: string }>(err: Error | null, user: TUser): TUser {
    if (err || !user) throw err || new UnauthorizedException();
    if ((user as { role?: string }).role !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }
    return user;
  }
}

@Injectable()
export class CustomerAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { role?: string }>(err: Error | null, user: TUser): TUser {
    if (err || !user) throw err || new UnauthorizedException();
    if ((user as { role?: string }).role !== 'customer') {
      throw new UnauthorizedException('Please sign in to continue');
    }
    return user;
  }
}

/** Attaches customer if token present; never blocks the request. */
@Injectable()
export class OptionalCustomerAuthGuard extends AuthGuard('jwt') implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    if (!req.headers.authorization) return true;
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser = { role?: string } | null>(err: Error | null, user: TUser): TUser | null {
    if (err || !user) return null;
    if ((user as { role?: string }).role !== 'customer') return null;
    return user;
  }
}
