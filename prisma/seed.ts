import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PrismaClient, Role, AppointmentStatus, Weekday } from '@prisma/client';

process.env.FIREBASE_AUTH_EMULATOR_HOST ||= 'localhost:9099';
initializeApp({ projectId: 'le-chic-coupe' });

const prisma = new PrismaClient();

const USERS = [
  { 
    uid: 'uid-owner-001',
    email: 'owner@lechiccoupe.fr',
    password: 'P4ssword!',
    displayName: 'Owner One',
    role: Role.OWNER,
    firstName: 'Owner',
    lastName: 'One',
    phone: '+33100000000',
  },
  { 
    uid: 'uid-staff-001',
    email: 'staff@lechiccoupe.fr',
    password: 'P4ssword!',
    displayName: 'Staff Member',
    role: Role.STAFF,
    firstName: 'Staff',
    lastName: 'Member',
    phone: '+33100000001',
  },
  { 
    uid: 'uid-customer-001',
    email: 'customer@lechiccoupe.fr',
    password: 'P4ssword!',
    displayName: 'Customer One',
    role: Role.CUSTOMER,
    firstName: 'Customer',
    lastName: 'One',
    phone: '+33100000002',
  },
];

async function ensureAuthUser(u: typeof USERS[number]) {
  try {
    await getAuth().getUser(u.uid);
  } catch {
    await getAuth().createUser({
      uid: u.uid,
      email: u.email,
      password: u.password,
      displayName: u.displayName,
      emailVerified: true,
    });
  }
}

// Helpers — fabrique une Date en heure de Paris (CEST, +02:00) à partir d'une date et d'un HH:mm
function parisDate(dateYYYYMMDD: string, hm: string) {
  // Exemple: "2025-09-16", "09:30" => "2025-09-16T09:30:00+02:00"
  return new Date(`${dateYYYYMMDD}T${hm}:00+02:00`);
}
function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

async function main() {
  // 1) Users dans Firebase
  for (const u of USERS) await ensureAuthUser(u);
  console.log('Auth Emulator seeded ✅');

  // 2) Users dans Prisma (upsert)
  const prismaUsers: Record<Role, any> = {} as any;
  for (const u of USERS) {
    prismaUsers[u.role] = await prisma.user.upsert({
      where: { firebaseUid: u.uid },
      update: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        phone: u.phone,
      },
      create: {
        firebaseUid: u.uid,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        phone: u.phone,
      },
    });
  }

  // 3) Services — ne crée que si table vide ; sinon réutilise le premier trouvé
  let service = await prisma.service.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!service) {
    service = await prisma.service.create({
      data: {
        name: 'Coupe & Coiffage',
        durationMin: 45,
        priceCents: 3500,
        description: 'Shampoing, coupe, coiffage',
      },
    });
    // (Optionnel) en ajouter d'autres ici si tu veux étoffer la démo
  }

  // 4) Availabilities (mardi & jeudi) pour le staff-001
  await prisma.staffAvailability.createMany({
    data: [
      { staffId: prismaUsers[Role.STAFF].id, day: Weekday.TUE, startTime: '09:00', endTime: '12:00' },
      { staffId: prismaUsers[Role.STAFF].id, day: Weekday.TUE, startTime: '14:00', endTime: '18:00' },
      { staffId: prismaUsers[Role.STAFF].id, day: Weekday.THU, startTime: '09:00', endTime: '18:00' },
    ],
    skipDuplicates: true,
  });

  // 5) Appointments — autour du 16/09/2025
  // On nettoie d'abord la période (15→19 sept) pour des seeds idempotents
  const from = new Date('2025-09-15T00:00:00+02:00');
  const to   = new Date('2025-09-19T00:00:00+02:00');
  await prisma.appointment.deleteMany({
    where: { startAt: { gte: from, lt: to } },
  });

  const DUR = service.durationMin ?? 45; // minutes
  const custId = prismaUsers[Role.CUSTOMER].id;
  const staffId = prismaUsers[Role.STAFF].id;

  // Mardi 16/09/2025 (TUE)
  const s1 = parisDate('2025-09-16', '10:00'); // 10:00 → 10:45
  const e1 = addMinutes(s1, DUR);
  const s2 = parisDate('2025-09-16', '15:30'); // 15:30 → 16:15
  const e2 = addMinutes(s2, DUR);

  // Jeudi 18/09/2025 (THU)
  const s3 = parisDate('2025-09-18', '09:00'); // 09:00 → 09:45
  const e3 = addMinutes(s3, DUR);
  const s4 = parisDate('2025-09-18', '13:00'); // 13:00 → 13:45
  const e4 = addMinutes(s4, DUR);

  await prisma.appointment.createMany({
    data: [
      { startAt: s1, endAt: e1, status: AppointmentStatus.CONFIRMED, serviceId: service.id, customerId: custId, staffId },
      { startAt: s2, endAt: e2, status: AppointmentStatus.CONFIRMED, serviceId: service.id, customerId: custId, staffId },
      { startAt: s3, endAt: e3, status: AppointmentStatus.CONFIRMED, serviceId: service.id, customerId: custId, staffId },
      { startAt: s4, endAt: e4, status: AppointmentStatus.CONFIRMED, serviceId: service.id, customerId: custId, staffId },
    ],
    skipDuplicates: true,
  });

  console.log('Prisma DB seeded ✅');
}

main()
  .catch((e)=> { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
