import { Injectable, ForbiddenException } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class DevHelperService {
  constructor(private readonly http: HttpService) {}

  private ensureDev() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev-only endpoint');
    }
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      throw new ForbiddenException('FIREBASE_AUTH_EMULATOR_HOST not set');
    }
  }

  private get AUTH_BASE_URL(): string {
    const host = process.env.FIREBASE_AUTH_EMULATOR_HOST!;
    return `http://${host}/identitytoolkit.googleapis.com/v1`;
  }

  private get API_KEY(): string {
    // En émulateur, n’importe quelle valeur fonctionne.
    return process.env.API_KEY || 'any';
  }

  async idTokenByUid(uid: string) {
    this.ensureDev();
    const auth = getAuth();

    // S’assurer que l’utilisateur existe (sinon on le crée à la volée)
    try { await auth.getUser(uid); }
    catch { await auth.createUser({ uid, emailVerified: true, displayName: uid }); }

    // 1) custom token
    const customToken = await auth.createCustomToken(uid);

    // 2) échange -> ID token (émulateur)
    const resp = await firstValueFrom(
      this.http.post(
        `${this.AUTH_BASE_URL}/accounts:signInWithCustomToken?key=${this.API_KEY}`,
        { token: customToken, returnSecureToken: true },
      ),
    );

    return { idToken: resp.data.idToken as string, expiresIn: resp.data.expiresIn as number };
  }
}
