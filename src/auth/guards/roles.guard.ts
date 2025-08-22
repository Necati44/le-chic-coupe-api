import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ALLOW_SELF_KEY } from '../decorators/allow-self.decorator';
import { Role } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { logInfo, logWarn } from '../../common/logging/logger';
import type { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const allowSelfParam = this.reflector.getAllAndOverride<string>(
      ALLOW_SELF_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    // S’il n’y a pas d’exigence de rôle et pas d’allowSelf => laisser passer
    if ((!required || required.length === 0) && !allowSelfParam) return true;

    // Le FirebaseAuthGuard doit avoir posé req.user (token Firebase)
    const firebase = (req as any).user as
      | { uid?: string; email?: string }
      | undefined;
    if (!firebase?.uid) {
      logWarn('roles_guard.missing_firebase_user', {
        path: req.method + ' ' + req.url,
      });
      throw new ForbiddenException('auth_required');
    }

    // Charger le user applicatif si besoin
    let appUser = (req as any).appUser ?? null;
    if (!appUser) {
      appUser = await this.users.findByFirebaseUid(firebase.uid);
      (req as any).appUser = appUser;
    }
    if (!appUser) {
      logWarn('roles_guard.no_profile', {
        uid: firebase.uid,
        email: firebase.email,
        path: req.method + ' ' + req.url,
      });
      throw new ForbiddenException('profile_not_finalized');
    }

    // 1) Cas AllowSelf ?
    if (allowSelfParam) {
      const targetId = req.params?.[allowSelfParam];
      if (targetId && targetId === appUser.id) {
        logInfo('roles_guard.allow_self', {
          path: req.method + ' ' + req.url,
          actorUserId: appUser.id,
          actorRole: appUser.role,
          targetId,
        });
        return true;
      }
    }

    // 2) Sinon, vérif des rôles requis
    if (!required || required.length === 0) return true; // (au cas où: only allowSelf était présent)
    const ok = required.includes(appUser.role as Role);

    logInfo('roles_guard.check', {
      path: req.method + ' ' + req.url,
      actorUserId: appUser.id,
      actorRole: appUser.role,
      requiredRoles: required,
      allowed: ok,
    });

    if (!ok) throw new ForbiddenException('insufficient_role');
    return true;
  }
}
