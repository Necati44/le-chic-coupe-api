import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';

// Prisma mock avec la même forme que ton service: this.prisma.client.*
function makePrismaMock() {
  const client: any = {
    service: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(client);
      return arg;
    }),
  };
  return { client };
}

describe('ServicesService (unit)', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: ServicesService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    prisma = makePrismaMock();
    service = new ServicesService(prisma as any);
    jest.spyOn(console, 'log').mockImplementation(() => {}); // coupe le bruit des logs JSON
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('crée un service', async () => {
      prisma.client.service.create.mockResolvedValueOnce({ id: 'svc1' });
      const dto: any = {
        name: 'Coupe',
        description: null,
        durationMin: 30,
        priceCents: 2500,
      };
      const out = await service.create(dto);
      expect(prisma.client.service.create).toHaveBeenCalledWith({ data: dto });
      expect(out).toEqual({ id: 'svc1' });
    });
  });

  describe('findAll', () => {
    it('avec search: filtre name contains (insensitive) + pagination + tri', async () => {
      const items = [{ id: 's1' }, { id: 's2' }];
      prisma.client.service.findMany.mockResolvedValueOnce(items);
      prisma.client.service.count.mockResolvedValueOnce(42);

      const q: any = {
        search: 'cou',
        skip: 5,
        take: 10,
        orderBy: 'name',
        orderDir: 'asc',
      };
      const out = await service.findAll(q);

      expect(prisma.client.service.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'cou', mode: 'insensitive' } },
        skip: 5,
        take: 10,
        orderBy: { name: 'asc' },
      });
      expect(prisma.client.service.count).toHaveBeenCalledWith({
        where: { name: { contains: 'cou', mode: 'insensitive' } },
      });
      expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
      expect(out).toEqual({ items, total: 42, skip: 5, take: 10 });
    });

    it('sans search: where undefined est passé tel quel', async () => {
      const items: any[] = [];
      prisma.client.service.findMany.mockResolvedValueOnce(items);
      prisma.client.service.count.mockResolvedValueOnce(0);

      const q: any = {
        skip: 0,
        take: 20,
        orderBy: 'priceCents',
        orderDir: 'desc',
      };
      const out = await service.findAll(q);

      expect(prisma.client.service.findMany).toHaveBeenCalledWith({
        where: undefined,
        skip: 0,
        take: 20,
        orderBy: { priceCents: 'desc' },
      });
      expect(prisma.client.service.count).toHaveBeenCalledWith({
        where: undefined,
      });
      expect(out).toEqual({ items: [], total: 0, skip: 0, take: 20 });
    });
  });

  describe('findOne', () => {
    it('retourne le service si trouvé', async () => {
      prisma.client.service.findUnique.mockResolvedValueOnce({ id: 's1' });
      const out = await service.findOne('s1');
      expect(prisma.client.service.findUnique).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
      expect(out).toEqual({ id: 's1' });
    });

    it('jette NotFound si inexistant', async () => {
      prisma.client.service.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('met à jour un service', async () => {
      prisma.client.service.update.mockResolvedValueOnce({
        id: 's1',
        name: 'Nouveau',
      });
      const dto: any = { name: 'Nouveau' };
      const out = await service.update('s1', dto);
      expect(prisma.client.service.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: dto,
      });
      expect(out).toEqual({ id: 's1', name: 'Nouveau' });
    });
  });

  describe('remove', () => {
    it('supprime et renvoie {id, deleted:true}', async () => {
      prisma.client.service.delete.mockResolvedValueOnce({ id: 's1' });
      const out = await service.remove('s1');
      expect(prisma.client.service.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
      expect(out).toEqual({ id: 's1', deleted: true });
    });
  });
});
