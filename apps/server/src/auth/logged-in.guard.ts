import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';

@Injectable()
export class LoggedInGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.isAuthenticated && request.isAuthenticated()) {
      return true;
    }

    throw new UnauthorizedException('Not authenticated');
  }
}
