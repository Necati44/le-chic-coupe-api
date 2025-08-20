import { PrismaClient, Role, AppointmentStatus, Weekday } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'owner@chic-coupe.fr' },
    update: {},
    create: {
      email: 'owner@chic-coupe.fr',
      firstName: 'Lina',
      lastName: 'Durand',
      role: Role.OWNER,
      phone: '0600000000',
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'coiffeur@chic-coupe.fr',
      firstName: 'Alex',
      lastName: 'Martin',
      role: Role.STAFF,
      phone: '0611111111',
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'client@test.fr',
      firstName: 'Emma',
      lastName: 'R.',
      role: Role.CUSTOMER,
      phone: '0622222222',
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
