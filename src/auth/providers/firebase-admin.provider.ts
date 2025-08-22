// src/auth/firebase-admin.provider.ts
import { initializeApp, applicationDefault, cert, getApps, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const appInit = (() => {
  if (!getApps().length) {
    // secret base64 en CI: FIREBASE_SERVICE_ACCOUNT_BASE64
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (base64) {
      const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as ServiceAccount;
      initializeApp({ credential: cert(json) });
    } else {
      // Sinon, laisse ADC lire GOOGLE_APPLICATION_CREDENTIALS
      initializeApp({ credential: applicationDefault() });
    }
  }
})();

export const firebaseAdmin = getAuth();
