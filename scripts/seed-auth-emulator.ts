import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

process.env.FIREBASE_AUTH_EMULATOR_HOST ||= 'localhost:9099';
initializeApp({ projectId: 'le-chic-coupe' });

const users = [
  { uid: 'uid-owner-001',    email: 'owner@lechiccoupe.fr',    password: 'P4ssword!', displayName: 'Owner One' },
  { uid: 'uid-staff-001',    email: 'staff@lechiccoupe.fr',    password: 'P4ssword!', displayName: 'Staff Member' },
  { uid: 'uid-customer-001', email: 'customer@lechiccoupe.fr', password: 'P4ssword!', displayName: 'Customer One' },
];

async function ensure(u:{uid:string;email:string;password:string;displayName:string}) {
  try {
    await getAuth().getUser(u.uid);
  } catch {
    await getAuth().createUser({ ...u, emailVerified: true });
  }
}

(async () => {
  for (const u of users) await ensure(u);
  console.log('Auth Emulator seeded ✅');
})();
