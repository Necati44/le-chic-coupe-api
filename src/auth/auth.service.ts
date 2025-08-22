import { Injectable, BadRequestException } from '@nestjs/common';
import { auth } from 'firebase-admin';
import { UsersService } from '../users/users.service';

type LoginOkExisting = {
  authenticated: true;
  needsProfile: false;
  user: { id: string; email: string; firstName: string; lastName: string };
  sessionCookie: string;
  expiresIn: number;
};
type LoginOkNeedsProfile = {
  authenticated: true;
  needsProfile: true;
  prefill: { email: string; displayName: string; photoURL: string };
  sessionCookie: string;
  expiresIn: number;
};
type LoginNoEmail = { authenticated: false; reason: 'no_email' };
export type LoginResult = LoginOkExisting | LoginOkNeedsProfile | LoginNoEmail;

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService) {}

  async loginWithIdToken(idToken: string): Promise<LoginResult> {
    if (!idToken?.trim()) {
      throw new BadRequestException('idToken required');
    }

    const decoded = await auth().verifyIdToken(idToken, true);

    if (!decoded.email) {
      return { authenticated: false, reason: 'no_email' };
    }

    // Cookie de session : 1 semaine
    const expiresIn = 1000 * 60 * 60 * 24 * 7;
    const sessionCookie = await auth().createSessionCookie(idToken, { expiresIn });

    const existing = await this.users.findByFirebaseUid(decoded.uid);
    if (existing) {
      return {
        authenticated: true,
        needsProfile: false,
        user: {
          id: existing.id,
          email: existing.email,
          firstName: existing.firstName,
          lastName: existing.lastName,
        },
        sessionCookie,
        expiresIn,
      };
    }

    return {
      authenticated: true,
      needsProfile: true,
      prefill: {
        email: decoded.email,
        displayName: decoded.name ?? '',
        photoURL: decoded.picture ?? '',
      },
      sessionCookie,
      expiresIn,
    };
  }
}
