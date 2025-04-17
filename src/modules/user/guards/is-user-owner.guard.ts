import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class IsUserOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { sub: string };
    
    // Get the user ID from the route params or use the one from the body
    const targetUserId = request.params.id || request.body.userId;
    
    // If no user is connected or no target user ID, deny access
    if (!user?.sub || !targetUserId) {
      throw new ForbiddenException('Access denied');
    }

    // Allow access only if the connected user is modifying their own data
    if (user.sub !== targetUserId) {
      throw new ForbiddenException('You can only modify your own information');
    }

    return true;
  }
}
