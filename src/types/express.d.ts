import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    // Présent via FirebaseAuthGuard (DecodedIdToken)
    user?: any;
    // User applicatif (Prisma)
    appUser?: import('@prisma/client').User | null;
  }
}
