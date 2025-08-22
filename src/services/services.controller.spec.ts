import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Role } from '@prisma/client';

describe('ServicesController (unit)', () => {
  let controller: ServicesController;
  let svc: any;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    svc = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new ServicesController(svc as ServicesService);
    jest.spyOn(console, 'log').mockImplementation(() => {}); // coupe le bruit des logs
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll (PUBLIC)', () => {
    it('passe la query au service', async () => {
      const q: any = {
        search: 'cou',
        skip: 0,
        take: 10,
        orderBy: 'name',
        orderDir: 'asc',
      };
      svc.findAll.mockResolvedValueOnce({
        items: [],
        total: 0,
        skip: 0,
        take: 10,
      });

      const out = await controller.findAll(q);

      expect(svc.findAll).toHaveBeenCalledWith(q);
      expect(out).toEqual({ items: [], total: 0, skip: 0, take: 10 });
    });
  });

  describe('findOne (PUBLIC)', () => {
    it('renvoie le service demandé', async () => {
      svc.findOne.mockResolvedValueOnce({ id: 's1' });
      const out = await controller.findOne('s1');
      expect(svc.findOne).toHaveBeenCalledWith('s1');
      expect(out).toEqual({ id: 's1' });
    });
  });

  describe('create (OWNER/STAFF)', () => {
    it('appelle le service avec le dto', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      const dto: any = {
        name: 'Brushing',
        description: null,
        durationMin: 45,
        priceCents: 3000,
      };
      svc.create.mockResolvedValueOnce({ id: 's2' });

      const out = await controller.create(dto, req);

      expect(svc.create).toHaveBeenCalledWith(dto);
      expect(out).toEqual({ id: 's2' });
    });
  });

  describe('update (OWNER/STAFF)', () => {
    it('appelle le service avec id + dto', async () => {
      const req: any = { appUser: { id: 'u-owner', role: Role.OWNER } };
      const dto: any = { priceCents: 4200 };
      svc.update.mockResolvedValueOnce({ id: 's3', priceCents: 4200 });

      const out = await controller.update('s3', dto, req);

      expect(svc.update).toHaveBeenCalledWith('s3', dto);
      expect(out).toEqual({ id: 's3', priceCents: 4200 });
    });
  });

  describe('remove (OWNER)', () => {
    it('appelle le service avec id', async () => {
      const req: any = { appUser: { id: 'u-owner', role: Role.OWNER } };
      svc.remove.mockResolvedValueOnce({ id: 's4', deleted: true });

      const out = await controller.remove('s4', req);

      expect(svc.remove).toHaveBeenCalledWith('s4');
      expect(out).toEqual({ id: 's4', deleted: true });
    });
  });
});
