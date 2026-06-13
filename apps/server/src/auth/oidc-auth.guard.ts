import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class OidcAuthGuard extends AuthGuard('oidc') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    // If user is already authenticated via session, allow access
    if ((request as any).user) {
      return true;
    }

    // Otherwise, trigger OIDC authentication
    return super.canActivate(context);
  }
}
