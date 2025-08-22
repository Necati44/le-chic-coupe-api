import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StaffAvailabilitiesService } from './staff-availabilities.service';

// Prisma mock avec la même forme que ton service: this.prisma.client.*
function makePrismaMock() {
  const client: any = {
    staffAvailability: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(client);
      return arg;
    }),
  };
  return { client };
}

describe('StaffAvailabilitiesService (unit)', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: StaffAvailabilitiesService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    prisma = makePrismaMock();
    service = new StaffAvailabilitiesService(prisma as any);
    jest.spyOn(console, 'log').mockImplementation(() => {}); // coupe les logs JSON
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('rejette si startTime >= endTime', async () => {
      await expect(
        service.create({ staffId: 's1', day: 'MON', startTime: '10:00', endTime: '10:00' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si overlap DB détecté', async () => {
      prisma.client.staffAvailability.findFirst.mockResolvedValueOnce({
        id: 'ex1',
        startTime: '09:30',
        endTime: '10:30',
      });

      await expect(
        service.create({ staffId: 's1', day: 'MON', startTime: '10:00', endTime: '11:00' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('créé la dispo si ok', async () => {
      prisma.client.staffAvailability.findFirst.mockResolvedValueOnce(null);
      prisma.client.staffAvailability.create.mockResolvedValueOnce({ id: 'a1' });

      const out = await service.create({ staffId: 's1', day: 'MON', startTime: '09:00', endTime: '10:00' } as any);
      expect(prisma.client.staffAvailability.create).toHaveBeenCalledWith({
        data: { staffId: 's1', day: 'MON', startTime: '09:00', endTime: '10:00' },
      });
      expect(out).toEqual({ id: 'a1' });
    });
  });

  describe('findAll', () => {
    it('retourne items/total (tri et pagination) via transaction', async () => {
      prisma.client.staffAvailability.findMany.mockResolvedValueOnce([{ id: 'x' }]);
      prisma.client.staffAvailability.count.mockResolvedValueOnce(1);

      const q: any = { staffId: 's1', day: 'TUE', skip: 5, take: 10 };
      const out = await service.findAll(q);

      expect(prisma.client.staffAvailability.findMany).toHaveBeenCalledWith({
        where: { staffId: 's1', day: 'TUE' },
        skip: 5,
        take: 10,
        orderBy: [{ staffId: 'asc' }, { day: 'asc' }, { startTime: 'asc' }],
      });
      expect(prisma.client.staffAvailability.count).toHaveBeenCalledWith({ where: { staffId: 's1', day: 'TUE' } });
      expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
      expect(out).toEqual({ items: [{ id: 'x' }], total: 1, skip: 5, take: 10 });
    });
  });

  describe('findOne', () => {
    it('retourne la dispo si trouvée', async () => {
      prisma.client.staffAvailability.findUnique.mockResolvedValueOnce({ id: 'd1' });

      const out = await service.findOne('d1');
      expect(prisma.client.staffAvailability.findUnique).toHaveBeenCalledWith({ where: { id: 'd1' } });
      expect(out).toEqual({ id: 'd1' });
    });

    it('jette NotFound si absente', async () => {
      prisma.client.staffAvailability.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('jette NotFound si la ressource n’existe pas', async () => {
      prisma.client.staffAvailability.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('x', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejette si startTime >= endTime (après merge current/dto)', async () => {
      prisma.client.staffAvailability.findUnique.mockResolvedValueOnce({
        id: 'd1',
        staffId: 's1',
        day: 'WED',
        startTime: '09:00',
        endTime: '10:00',
      });

      await expect(
        service.update('d1', { startTime: '10:00', endTime: '09:59' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si overlap DB détecté (excluant lui-même)', async () => {
      prisma.client.staffAvailability.findUnique.mockResolvedValueOnce({
        id: 'd1',
        staffId: 's1',
        day: 'WED',
        startTime: '09:00',
        endTime: '10:00',
      });
      prisma.client.staffAvailability.findFirst.mockResolvedValueOnce({
        id: 'other',
        startTime: '09:30',
        endTime: '10:30',
      });

      await expect(
        service.update('d1', { startTime: '09:15', endTime: '09:45' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('met à jour avec merge des champs implicites ok', async () => {
      prisma.client.staffAvailability.findUnique
        .mockResolvedValueOnce({
          id: 'd1',
          staffId: 's1',
          day: 'THU',
          startTime: '09:00',
          endTime: '10:00',
        });

      prisma.client.staffAvailability.findFirst.mockResolvedValueOnce(null);
      prisma.client.staffAvailability.update.mockResolvedValueOnce({ id: 'd1', day: 'THU', startTime: '09:30', endTime: '10:30' });

      const out = await service.update('d1', { startTime: '09:30', endTime: '10:30' } as any);

      expect(prisma.client.staffAvailability.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { startTime: '09:30', endTime: '10:30', day: 'THU' },
      });
      expect(out).toEqual({ id: 'd1', day: 'THU', startTime: '09:30', endTime: '10:30' });
    });
  });

  describe('remove', () => {
    it('supprime et renvoie {id, deleted:true}', async () => {
      prisma.client.staffAvailability.delete.mockResolvedValueOnce({ id: 'd1' });
      const out = await service.remove('d1');
      expect(prisma.client.staffAvailability.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
      expect(out).toEqual({ id: 'd1', deleted: true });
    });

    it('mappe P2025 => NotFound', async () => {
      const err: any = new Error('not found');
      err.code = 'P2025';
      prisma.client.staffAvailability.delete.mockRejectedValueOnce(err);

      await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('bulkUpsert', () => {
    it('rejette si staffId divergents dans les slots', async () => {
      await expect(
        service.bulkUpsert({
          staffId: 's1',
          slots: [
            { staffId: 's1', day: 'MON', startTime: '09:00', endTime: '10:00' },
            { staffId: 's2', day: 'MON', startTime: '10:00', endTime: '11:00' },
          ],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si un slot a startTime >= endTime', async () => {
      await expect(
        service.bulkUpsert({
          staffId: 's1',
          slots: [{ staffId: 's1', day: 'MON', startTime: '10:00', endTime: '10:00' }],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si overlap interne dans le payload', async () => {
      await expect(
        service.bulkUpsert({
          staffId: 's1',
          slots: [
            { staffId: 's1', day: 'MON', startTime: '09:00', endTime: '10:00' },
            { staffId: 's1', day: 'MON', startTime: '09:30', endTime: '10:30' }, // overlap
          ],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('remplace atomiquement: deleteMany -> createMany -> findMany (retourne slots)', async () => {
      prisma.client.staffAvailability.findMany.mockResolvedValueOnce([
        { id: 'a', day: 'MON', startTime: '09:00', endTime: '10:00' },
        { id: 'b', day: 'TUE', startTime: '13:00', endTime: '14:00' },
      ]);

      const dto: any = {
        staffId: 's1',
        slots: [
          { staffId: 's1', day: 'MON', startTime: '09:00', endTime: '10:00' },
          { staffId: 's1', day: 'TUE', startTime: '13:00', endTime: '14:00' },
        ],
      };

      const out = await service.bulkUpsert(dto);

      expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.client.staffAvailability.deleteMany).toHaveBeenCalledWith({ where: { staffId: 's1' } });
      expect(prisma.client.staffAvailability.createMany).toHaveBeenCalledWith({
        data: [
          { staffId: 's1', day: 'MON', startTime: '09:00', endTime: '10:00' },
          { staffId: 's1', day: 'TUE', startTime: '13:00', endTime: '14:00' },
        ],
        skipDuplicates: true,
      });
      expect(prisma.client.staffAvailability.findMany).toHaveBeenCalledWith({
        where: { staffId: 's1' },
        orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
      });
      expect(out).toEqual([
        { id: 'a', day: 'MON', startTime: '09:00', endTime: '10:00' },
        { id: 'b', day: 'TUE', startTime: '13:00', endTime: '14:00' },
      ]);
    });

    it('si slots vides: deleteMany puis [] sans createMany/findMany', async () => {
      const out = await service.bulkUpsert({ staffId: 's1', slots: [] } as any);

      expect(prisma.client.staffAvailability.deleteMany).toHaveBeenCalledWith({ where: { staffId: 's1' } });
      expect(prisma.client.staffAvailability.createMany).not.toHaveBeenCalled();
      expect(prisma.client.staffAvailability.findMany).not.toHaveBeenCalled();
      expect(out).toEqual([]);
    });
  });
});
