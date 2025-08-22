import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StaffAvailabilityController } from './staff-availabilities.controller';
import { StaffAvailabilitiesService } from './staff-availabilities.service';

describe('StaffAvailabilityController (unit)', () => {
  let controller: StaffAvailabilityController;
  let svc: any;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    svc = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      bulkUpsert: jest.fn(),
    };
    controller = new StaffAvailabilityController(
      svc as StaffAvailabilitiesService,
    );
    jest.spyOn(console, 'log').mockImplementation(() => {}); // coupe logs
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('force staffId pour STAFF (self)', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      const dto: any = { day: 'MON', startTime: '09:00', endTime: '10:00' }; // pas de staffId
      svc.create.mockResolvedValueOnce({ id: 'd1' });

      const out = await controller.create(dto, req);

      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: 'u-staff' }),
      );
      expect(out).toEqual({ id: 'd1' });
    });

    it('ne force pas staffId pour OWNER', async () => {
      const req: any = { appUser: { id: 'u-owner', role: Role.OWNER } };
      const dto: any = {
        staffId: 'u-x',
        day: 'MON',
        startTime: '09:00',
        endTime: '10:00',
      };
      svc.create.mockResolvedValueOnce({ id: 'd2' });

      const out = await controller.create(dto, req);

      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: 'u-x' }),
      );
      expect(out).toEqual({ id: 'd2' });
    });
  });

  describe('findAll', () => {
    it('passe la query telle quelle (OWNER/STAFF)', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      const q: any = { staffId: 'u-staff', day: 'MON', skip: 0, take: 20 };
      svc.findAll.mockResolvedValueOnce({
        items: [],
        total: 0,
        skip: 0,
        take: 20,
      });

      const out = await controller.findAll(q, req);

      expect(svc.findAll).toHaveBeenCalledWith(q);
      expect(out).toEqual({ items: [], total: 0, skip: 0, take: 20 });
    });
  });

  describe('findOne', () => {
    it('STAFF ne peut lire que ses propres dispos', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      svc.findOne.mockResolvedValueOnce({ id: 'd1', staffId: 'u-staff' });

      const ok = await controller.findOne('d1', req);
      expect(ok).toEqual({ id: 'd1', staffId: 'u-staff' });

      svc.findOne.mockResolvedValueOnce({ id: 'd2', staffId: 'other' });
      await expect(controller.findOne('d2', req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('STAFF: refuse si la dispo ne lui appartient pas', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      svc.findOne.mockResolvedValueOnce({ id: 'd1', staffId: 'other' });

      await expect(
        controller.update('d1', { startTime: '09:00' } as any, req),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(svc.update).not.toHaveBeenCalled();
    });

    it('STAFF: refuse de changer staffId', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      svc.findOne.mockResolvedValueOnce({ id: 'd1', staffId: 'u-staff' });

      await expect(
        controller.update('d1', { staffId: 'other' } as any, req),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(svc.update).not.toHaveBeenCalled();
    });

    it('STAFF: autorisé sur sa propre dispo', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      svc.findOne.mockResolvedValueOnce({ id: 'd1', staffId: 'u-staff' });
      svc.update.mockResolvedValueOnce({ id: 'd1', startTime: '10:00' });

      const out = await controller.update(
        'd1',
        { startTime: '10:00' } as any,
        req,
      );
      expect(svc.update).toHaveBeenCalledWith('d1', { startTime: '10:00' });
      expect(out).toEqual({ id: 'd1', startTime: '10:00' });
    });

    it('OWNER: autorisé sans restriction', async () => {
      const req: any = { appUser: { id: 'u-owner', role: Role.OWNER } };
      svc.findOne.mockResolvedValueOnce({ id: 'd1', staffId: 'someone' });
      svc.update.mockResolvedValueOnce({ id: 'd1', endTime: '12:00' });

      const out = await controller.update(
        'd1',
        { endTime: '12:00' } as any,
        req,
      );
      expect(svc.update).toHaveBeenCalledWith('d1', { endTime: '12:00' });
      expect(out).toEqual({ id: 'd1', endTime: '12:00' });
    });
  });

  describe('remove', () => {
    it('STAFF: refuse si ce n’est pas sa dispo', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      svc.findOne.mockResolvedValueOnce({ id: 'd1', staffId: 'other' });

      await expect(controller.remove('d1', req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(svc.remove).not.toHaveBeenCalled();
    });

    it('STAFF: autorisé sur sa propre dispo', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      svc.findOne.mockResolvedValueOnce({ id: 'd1', staffId: 'u-staff' });
      svc.remove.mockResolvedValueOnce({ id: 'd1', deleted: true });

      const out = await controller.remove('d1', req);
      expect(svc.remove).toHaveBeenCalledWith('d1');
      expect(out).toEqual({ id: 'd1', deleted: true });
    });
  });

  describe('bulkUpsert', () => {
    it('STAFF: force staffId sur lui-même', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      const dto: any = {
        staffId: 'other', // sera écrasé
        slots: [
          {
            staffId: 'other',
            day: 'MON',
            startTime: '09:00',
            endTime: '10:00',
          },
        ],
      };
      svc.bulkUpsert.mockResolvedValueOnce([{ id: 'a' }]);

      const out = await controller.bulkUpsert(dto, req);

      expect(svc.bulkUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'u-staff',
          slots: [expect.objectContaining({ staffId: 'u-staff' })], // vu qu’on écrase dto.staffId, tes DTO d’input côté client doivent aussi le respecter si tu le veux strictement
        }),
      );
      expect(out).toEqual([{ id: 'a' }]);
    });

    it('OWNER: passe-through', async () => {
      const req: any = { appUser: { id: 'u-owner', role: Role.OWNER } };
      const dto: any = {
        staffId: 's1',
        slots: [
          { staffId: 's1', day: 'TUE', startTime: '10:00', endTime: '11:00' },
        ],
      };
      svc.bulkUpsert.mockResolvedValueOnce([{ id: 'b' }]);

      const out = await controller.bulkUpsert(dto, req);

      expect(svc.bulkUpsert).toHaveBeenCalledWith(dto);
      expect(out).toEqual([{ id: 'b' }]);
    });
  });
});
