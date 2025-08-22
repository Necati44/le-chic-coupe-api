import { ForbiddenException } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { Role } from '@prisma/client';

describe('AppointmentsController (unit)', () => {
  let controller: AppointmentsController;
  let svc: any;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    svc = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      cancel: jest.fn(),
    } as any;

    controller = new AppointmentsController(svc);
  });

  describe('create', () => {
    it('force customerId pour un CUSTOMER', async () => {
      const req: any = { appUser: { id: 'u-cust', role: Role.CUSTOMER } };
      const dto: any = {
        startAt: '2025-08-22T10:00:00Z',
        endAt: '2025-08-22T11:00:00Z',
        serviceId: 'svc1',
      };
      svc.create.mockResolvedValueOnce({ id: 'a1' });

      const out = await controller.create(dto, req);

      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'u-cust' }),
      );
      expect(out).toEqual({ id: 'a1' });
    });

    it('ne force pas customerId pour OWNER/STAFF', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      const dto: any = {
        startAt: '2025-08-22T10:00:00Z',
        endAt: '2025-08-22T11:00:00Z',
        serviceId: 'svc1',
        customerId: 'u-x',
      };
      svc.create.mockResolvedValueOnce({ id: 'a2' });

      const out = await controller.create(dto, req);

      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'u-x' }),
      );
      expect(out).toEqual({ id: 'a2' });
    });
  });

  describe('list', () => {
    it('passe la query au service (OWNER/STAFF)', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      const q: any = { staffId: 'u-staff' };
      svc.findMany.mockResolvedValueOnce({ items: [], total: 0 });

      const out = await controller.list(q, req);

      expect(svc.findMany).toHaveBeenCalledWith(q);
      expect(out).toEqual({ items: [], total: 0 });
    });
  });

  describe('get', () => {
    it('autorise CUSTOMER uniquement sur son propre RDV', async () => {
      const req: any = { appUser: { id: 'u-cust', role: Role.CUSTOMER } };
      svc.findOne.mockResolvedValueOnce({
        id: 'a1',
        customerId: 'u-cust',
      } as any);

      const ok = await controller.get('a1', req);
      expect(ok).toEqual({ id: 'a1', customerId: 'u-cust' });

      svc.findOne.mockResolvedValueOnce({
        id: 'a2',
        customerId: 'other',
      } as any);
      await expect(controller.get('a2', req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('refuse CUSTOMER si le RDV ne lui appartient pas', async () => {
      const req: any = { appUser: { id: 'u-cust', role: Role.CUSTOMER } };
      svc.findOne.mockResolvedValueOnce({
        id: 'a2',
        customerId: 'other',
      } as any);

      await expect(
        controller.update('a2', { status: 'CONFIRMED' } as any, req),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(svc.update).not.toHaveBeenCalled();
    });

    it('autorise CUSTOMER sur son RDV', async () => {
      const req: any = { appUser: { id: 'u-cust', role: Role.CUSTOMER } };
      svc.findOne.mockResolvedValueOnce({
        id: 'a1',
        customerId: 'u-cust',
      } as any);
      svc.update.mockResolvedValueOnce({
        id: 'a1',
        status: 'CONFIRMED',
      } as any);

      const out = await controller.update(
        'a1',
        { status: 'CONFIRMED' } as any,
        req,
      );
      expect(svc.update).toHaveBeenCalledWith('a1', { status: 'CONFIRMED' });
      expect(out).toEqual({ id: 'a1', status: 'CONFIRMED' });
    });

    it('autorise STAFF/OWNER sans restriction', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      svc.findOne.mockResolvedValueOnce({
        id: 'a1',
        customerId: 'other',
      } as any);
      svc.update.mockResolvedValueOnce({ id: 'a1' } as any);

      const out = await controller.update(
        'a1',
        { status: 'COMPLETED' } as any,
        req,
      );
      expect(svc.update).toHaveBeenCalledWith('a1', { status: 'COMPLETED' });
      expect(out).toEqual({ id: 'a1' });
    });
  });

  describe('cancel', () => {
    it('refuse CUSTOMER si le RDV ne lui appartient pas', async () => {
      const req: any = { appUser: { id: 'u-cust', role: Role.CUSTOMER } };
      svc.findOne.mockResolvedValueOnce({
        id: 'a2',
        customerId: 'other',
      } as any);

      await expect(controller.cancel('a2', req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(svc.cancel).not.toHaveBeenCalled();
    });

    it('autorise CUSTOMER sur son RDV', async () => {
      const req: any = { appUser: { id: 'u-cust', role: Role.CUSTOMER } };
      svc.findOne.mockResolvedValueOnce({
        id: 'a1',
        customerId: 'u-cust',
      } as any);
      svc.cancel.mockResolvedValueOnce({
        id: 'a1',
        status: 'CANCELLED',
      } as any);

      const out = await controller.cancel('a1', req);
      expect(svc.cancel).toHaveBeenCalledWith('a1');
      expect(out).toEqual({ id: 'a1', status: 'CANCELLED' });
    });
  });

  describe('remove', () => {
    it('appelle le service (OWNER/STAFF)', async () => {
      const req: any = { appUser: { id: 'u-staff', role: Role.STAFF } };
      svc.remove.mockResolvedValueOnce({ id: 'a1', deleted: true } as any);

      const out = await controller.remove('a1', req);
      expect(svc.remove).toHaveBeenCalledWith('a1');
      expect(out).toEqual({ id: 'a1', deleted: true });
    });
  });
});
