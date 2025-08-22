import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';

// Prisma mock avec la même forme que ton service: this.prisma.client.*
function makePrismaMock() {
  const client: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb(client)),
  };
  return { client };
}

describe('UsersService (unit)', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: UsersService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.useFakeTimers({ now: new Date('2025-08-22T12:00:00Z') });
    prisma = makePrismaMock();
    service = new UsersService(prisma as any); // constructeur attend PrismaService, on passe le mock shape-compatible
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('createFromFirebase', () => {
    it("crée l’utilisateur (email pris depuis le TOKEN — dto ignoré pour sécurité)", async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce(null);
      prisma.client.user.create.mockResolvedValueOnce({
        id: 'u1',
        firebaseUid: 'uid-123',
        email: 'token@example.com',
        firstName: 'A',
        lastName: 'B',
      });

      const dto = { firstName: 'A', lastName: 'B', email: 'dto@example.com' } as any;
      const created = await service.createFromFirebase('uid-123', 'token@example.com', dto);

      expect(prisma.client.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firebaseUid: 'uid-123',
          email: 'token@example.com', // <- TOKEN prioritaire
          firstName: 'A',
          lastName: 'B',
        }),
      });
      expect(created.id).toBe('u1');
    });

    it('crée en utilisant l’email du token si dto.email est absent', async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce(null);
      prisma.client.user.create.mockResolvedValueOnce({ id: 'u2' });

      const dto = { firstName: 'A', lastName: 'B' } as any;
      await service.createFromFirebase('uid-123', 'token@example.com', dto);

      expect(prisma.client.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'token@example.com' }),
      });
    });

    it("rejette si l'email appartient à un autre utilisateur (conflit)", async () => {
      prisma.client.user.findUnique
        // existingByEmail
        .mockResolvedValueOnce({ id: 'other', firebaseUid: 'uid-OTHER' });

      await expect(
        service.createFromFirebase('uid-123', 'taken@example.com', { firstName: 'A', lastName: 'B' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("autorise si l'email correspond au même uid (idempotent)", async () => {
      prisma.client.user.findUnique
        // existingByEmail
        .mockResolvedValueOnce({ id: 'same', firebaseUid: 'uid-123' });
      prisma.client.user.create.mockResolvedValueOnce({ id: 'same' });

      await service.createFromFirebase('uid-123', 'same@example.com', { firstName: 'A', lastName: 'B' } as any);

      expect(prisma.client.user.create).toHaveBeenCalled();
    });
  });

  describe('findByFirebaseUid', () => {
    it('retourne le user trouvé', async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce({ id: 'u1', firebaseUid: 'uid-1' });
      const u = await service.findByFirebaseUid('uid-1');
      expect(u?.id).toBe('u1');
      expect(prisma.client.user.findUnique).toHaveBeenCalledWith({ where: { firebaseUid: 'uid-1' } });
    });
  });

  describe('remove', () => {
    it('annule les RDV futurs (staff & customer) puis supprime le user', async () => {
      prisma.client.appointment.updateMany
        .mockResolvedValueOnce({ count: 2 }) // staff cancelled
        .mockResolvedValueOnce({ count: 1 }); // customer cancelled

      prisma.client.user.delete.mockResolvedValueOnce({ id: 'u-delete' });

      const deleted = await service.remove('u-delete');

      const now = new Date('2025-08-22T12:00:00Z');

      expect(prisma.client.appointment.updateMany).toHaveBeenNthCalledWith(1, {
        where: { staffId: 'u-delete', startAt: { gt: now }, status: { not: 'CANCELLED' as any } },
        data: expect.objectContaining({ status: 'CANCELLED' as any }), // <- seulement status
      });

      expect(prisma.client.appointment.updateMany).toHaveBeenNthCalledWith(2, {
        where: { customerId: 'u-delete', startAt: { gt: now }, status: { not: 'CANCELLED' as any } },
        data: expect.objectContaining({ status: 'CANCELLED' as any }), // <- seulement status
      });

      expect(prisma.client.user.delete).toHaveBeenCalledWith({ where: { id: 'u-delete' } });
      expect(deleted.id).toBe('u-delete');

      expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
    });

    it('gère le cas sans RDV (counts = 0) et supprime quand même', async () => {
      prisma.client.appointment.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 });

      prisma.client.user.delete.mockResolvedValueOnce({ id: 'u0' });

      const deleted = await service.remove('u0');
      expect(deleted.id).toBe('u0');
    });
  });
});
