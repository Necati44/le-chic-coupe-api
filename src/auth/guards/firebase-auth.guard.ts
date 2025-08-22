import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { firebaseAdmin } from '../providers/firebase-admin.provider';
import type { Request } from 'express';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    const sessionCookie = (req as any).cookies?.session;

    try {
      let decoded: any | null = null;

      if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        const idToken = auth.slice('Bearer '.length);
        decoded = await firebaseAdmin.verifyIdToken(idToken, true);
      } else if (sessionCookie) {
        decoded = await firebaseAdmin.verifySessionCookie(sessionCookie, true);
      }

      if (!decoded) throw new UnauthorizedException('Missing auth token');

      (req as any).user = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        roles: decoded.roles ?? [],
      };
      (req as any).firebase = decoded; // alias "nouveau"

      return true;
    } catch {
      throw new UnauthorizedException('Invalid auth token');
    }
  }
}
