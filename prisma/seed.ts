import { PrismaClient, Role, AppointmentStatus, Weekday } from '@prisma/client';
const prisma = new PrismaClient();

// UIDs fixes pour aligner DB <-> Auth Emulator
const OWNER_UID    = 'uid-owner-001';
const STAFF_UID    = 'uid-staff-001';
const CUSTOMER_UID = 'uid-customer-001';

async function main() {
  const owner = await prisma.user.upsert({
    where: { firebaseUid: OWNER_UID }, // firebaseUid est unique => idempotent
    update: {
      email: 'owner@lechiccoupe.fr',
      firstName: 'Owner',
      lastName: 'One',
      role: Role.OWNER,
      phone: '+33100000000',
    },
    create: {
      firebaseUid: OWNER_UID,
      email: 'owner@lechiccoupe.fr',
      firstName: 'Owner',
      lastName: 'One',
      role: Role.OWNER,
      phone: '+33100000000',
    },
  });

  const staff = await prisma.user.upsert({
    where: { firebaseUid: STAFF_UID },
    update: {
      email: 'staff@lechiccoupe.fr',
      firstName: 'Staff',
      lastName: 'Member',
      role: Role.STAFF,
      phone: '+33100000001',
    },
    create: {
      firebaseUid: STAFF_UID,
      email: 'staff@lechiccoupe.fr',
      firstName: 'Staff',
      lastName: 'Member',
      role: Role.STAFF,
      phone: '+33100000001',
    },
  });

  const customer = await prisma.user.upsert({
    where: { firebaseUid: CUSTOMER_UID },
    update: {
      email: 'customer@lechiccoupe.fr',
      firstName: 'Customer',
      lastName: 'One',
      role: Role.CUSTOMER,
      phone: '+33100000002',
    },
    create: {
      firebaseUid: CUSTOMER_UID,
      email: 'customer@lechiccoupe.fr',
      firstName: 'Customer',
      lastName: 'One',
      role: Role.CUSTOMER,
      phone: '+33100000002',
    },
  });

  const service = await prisma.service.create({
    data: {
      name: 'Coupe & Coiffage',
      durationMin: 45,
      priceCents: 3500,
      description: 'Shampoing, coupe, coiffage',
    },
  });

  await prisma.staffAvailability.createMany({
    data: [
      { staffId: staff.id, day: Weekday.TUE, startTime: '09:00', endTime: '12:00' },
      { staffId: staff.id, day: Weekday.TUE, startTime: '14:00', endTime: '18:00' },
      { staffId: staff.id, day: Weekday.THU, startTime: '09:00', endTime: '18:00' },
    ],
    skipDuplicates: true,
  });

  await prisma.appointment.create({
    data: {
      startAt: new Date(Date.now() + 24 * 3600 * 1000), // +1 jour
      endAt: new Date(Date.now() + 24 * 3600 * 1000 + 45 * 60000),
      status: AppointmentStatus.CONFIRMED,
      serviceId: service.id,
      customerId: customer.id,
      staffId: staff.id,
    },
  });

  console.log('Seed done.');
}

main().finally(async () => prisma.$disconnect());
