import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentsService } from './appointments.service';

// Prisma mock avec la même forme que ton service: this.prisma.client.*
function makePrismaMock() {
  const client: any = {
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Supporte les deux formes de $transaction : tableau de Promises ou callback
    $transaction: jest.fn(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(client);
      return arg;
    }),
  };
  return { client };
}

describe('AppointmentsService (unit)', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: AppointmentsService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.useFakeTimers({ now: new Date('2025-08-22T12:00:00Z') });
    prisma = makePrismaMock();
    service = new AppointmentsService(prisma as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('rejette si endAt <= startAt', async () => {
      await expect(
        service.create({
          startAt: '2025-08-22T10:00:00Z',
          endAt: '2025-08-22T10:00:00Z',
          serviceId: 'svc1',
          customerId: 'cust1',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crée un rendez-vous avec status par défaut PENDING et staffId null', async () => {
      prisma.client.appointment.create.mockResolvedValueOnce({ id: 'a1' });

      const dto = {
        startAt: '2025-08-22T10:00:00Z',
        endAt: '2025-08-22T11:00:00Z',
        serviceId: 'svc1',
        customerId: 'cust1',
      } as any;

      const out = await service.create(dto);

      expect(prisma.client.appointment.create).toHaveBeenCalledWith({
        data: {
          startAt: new Date('2025-08-22T10:00:00Z'),
          endAt: new Date('2025-08-22T11:00:00Z'),
          status: AppointmentStatus.PENDING,
          serviceId: 'svc1',
          customerId: 'cust1',
          staffId: null,
        },
      });
      expect(out).toEqual({ id: 'a1' });
    });
  });

  describe('findMany', () => {
    it('applique les filtres et l’ordre par défaut (startAt asc) en transaction', async () => {
      const items = [{ id: 'a1' }, { id: 'a2' }];
      prisma.client.appointment.findMany.mockResolvedValueOnce(items);
      prisma.client.appointment.count.mockResolvedValueOnce(42);

      const q = {
        customerId: 'cust1',
        staffId: 'staff1',
        serviceId: 'svc1',
        status: AppointmentStatus.CONFIRMED,
        startFrom: '2025-08-20T00:00:00Z',
        endTo: '2025-08-30T23:59:59Z',
        skip: 5,
        take: 10,
      } as any;

      const res = await service.findMany(q);

      // findMany appelé avec where/orderBy/skip/take attendus
      expect(prisma.client.appointment.findMany).toHaveBeenCalledWith({
        where: {
          customerId: 'cust1',
          staffId: 'staff1',
          serviceId: 'svc1',
          status: AppointmentStatus.CONFIRMED as any,
          AND: [
            { startAt: { gte: new Date('2025-08-20T00:00:00Z') } },
            { endAt: { lte: new Date('2025-08-30T23:59:59Z') } },
          ],
        },
        orderBy: { startAt: 'asc' },
        skip: 5,
        take: 10,
        include: {
          service: true,
          customer: { select: { id: true, firstName: true, lastName: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      expect(prisma.client.appointment.count).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
      expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ items, total: 42 });
    });
  });

  describe('findOne', () => {
    it('retourne l’appointment avec includes', async () => {
      prisma.client.appointment.findUnique.mockResolvedValueOnce({ id: 'a1' });

      const out = await service.findOne('a1');
      expect(prisma.client.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 'a1' },
        include: {
          service: true,
          customer: { select: { id: true, firstName: true, lastName: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      expect(out).toEqual({ id: 'a1' });
    });

    it('jette NotFound si inexistant', async () => {
      prisma.client.appointment.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejette si on fournit startAt & endAt invalides', async () => {
      await expect(
        service.update('a1', {
          startAt: '2025-08-22T11:00:00Z',
          endAt: '2025-08-22T10:00:00Z',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('met à jour partiellement (status seul)', async () => {
      prisma.client.appointment.update.mockResolvedValueOnce({
        id: 'a1',
        status: AppointmentStatus.CANCELLED,
      });

      const out = await service.update('a1', {
        status: AppointmentStatus.CANCELLED,
      } as any);
      expect(prisma.client.appointment.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { status: AppointmentStatus.CANCELLED as any },
      });
      expect(out).toEqual({ id: 'a1', status: AppointmentStatus.CANCELLED });
    });
  });

  describe('remove', () => {
    it('supprime et renvoie {id, deleted:true}', async () => {
      prisma.client.appointment.delete.mockResolvedValueOnce({ id: 'a1' });
      const out = await service.remove('a1');
      expect(prisma.client.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'a1' },
      });
      expect(out).toEqual({ id: 'a1', deleted: true });
    });

    it('jette NotFound si delete échoue', async () => {
      prisma.client.appointment.delete.mockRejectedValueOnce(new Error('nope'));
      await expect(service.remove('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('passe le status à CANCELLED', async () => {
      prisma.client.appointment.update.mockResolvedValueOnce({
        id: 'a1',
        status: AppointmentStatus.CANCELLED,
      });
      const out = await service.cancel('a1');
      expect(prisma.client.appointment.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { status: AppointmentStatus.CANCELLED as any },
      });
      expect(out).toEqual({ id: 'a1', status: AppointmentStatus.CANCELLED });
    });
  });
});
