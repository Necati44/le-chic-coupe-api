import { PublicAvailabilitiesService } from './public-availabilities.service';

// Forcer un environnement TZ stable pour comparer les ISO
process.env.TZ = 'UTC';

// Prisma mock avec la forme this.prisma.client.*
function makePrismaMock() {
  const client: any = {
    service: { findUnique: jest.fn() },
    staffAvailability: { findMany: jest.fn() },
    appointment: { findMany: jest.fn() },
  };
  return { client };
}

describe('PublicAvailabilitiesService (unit)', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: PublicAvailabilitiesService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    prisma = makePrismaMock();
    service = new PublicAvailabilitiesService(prisma as any);
    jest.spyOn(console, 'log').mockImplementation(() => {}); // coupe les logs JSON
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retourne 0 slot quand aucune dispo', async () => {
    prisma.client.service.findUnique.mockResolvedValueOnce({
      id: 'svc1',
      durationMin: 30,
    });
    prisma.client.staffAvailability.findMany.mockResolvedValueOnce([]); // aucune dispo

    const out = await service.day({
      date: '2025-08-22', // n’importe quel jour
      serviceId: 'svc1',
    } as any);

    expect(out.date).toBe('2025-08-22');
    expect(Array.isArray(out.slots)).toBe(true);
    expect(out.slots.length).toBe(0);
  });

  it('génère des slots par pas de 15 min sur une fenêtre simple (09:00-10:00, durée 30)', async () => {
    prisma.client.service.findUnique.mockResolvedValueOnce({
      id: 'svc1',
      durationMin: 30,
    });
    // 1 staff, 1 fenêtre 09:00-10:00
    prisma.client.staffAvailability.findMany.mockResolvedValueOnce([
      { id: 'av1', staffId: 'st1', startTime: '09:00', endTime: '10:00' },
    ]);
    // Aucun RDV ce jour
    prisma.client.appointment.findMany.mockResolvedValueOnce([]);

    const out = await service.day({
      date: '2025-08-22',
      serviceId: 'svc1',
    } as any);

    // Créneaux attendus (durée 30, step 15) : 09:00-09:30, 09:15-09:45, 09:30-10:00 => 3 slots
    expect(out.slots.length).toBe(3);
    // Vérifie que tous les slots appartiennent au bon staff
    expect(new Set(out.slots.map(s => s.staffId))).toEqual(new Set(['st1']));
  });

  it('bloque les slots qui chevauchent un RDV existant', async () => {
    prisma.client.service.findUnique.mockResolvedValueOnce({
      id: 'svc1',
      durationMin: 30,
    });
    prisma.client.staffAvailability.findMany.mockResolvedValueOnce([
      { id: 'av1', staffId: 'st1', startTime: '09:00', endTime: '10:00' },
    ]);
    // RDV 09:30-10:00 -> bloque les slots [09:15-09:45] et [09:30-10:00], laisse [09:00-09:30]
    prisma.client.appointment.findMany.mockResolvedValueOnce([
      {
        id: 'apt1',
        staffId: 'st1',
        startAt: new Date('2025-08-22T09:30:00Z'),
        endAt: new Date('2025-08-22T10:00:00Z'),
        status: 'CONFIRMED',
      },
    ]);

    const out = await service.day({
      date: '2025-08-22',
      serviceId: 'svc1',
    } as any);

    expect(out.slots.length).toBe(1);
    expect(out.slots[0].staffId).toBe('st1');
  });

  it('respecte le filtrage par staffId (where staffId + slots uniquement de ce staff)', async () => {
    prisma.client.service.findUnique.mockResolvedValueOnce({
      id: 'svc1',
      durationMin: 30,
    });

    // On s’assure que le controller/service passe bien staffId dans le where de findMany :
    prisma.client.staffAvailability.findMany.mockImplementationOnce((args: any) => {
      // on vérifie que le where contient staffId = st2
      expect(args.where).toEqual(expect.objectContaining({ staffId: 'st2' }));
      // On renvoie des dispos pour st2
      return Promise.resolve([
        { id: 'av2', staffId: 'st2', startTime: '13:00', endTime: '14:00' },
      ]);
    });

    prisma.client.appointment.findMany.mockResolvedValueOnce([]);

    const out = await service.day({
      date: '2025-08-22',
      serviceId: 'svc1',
      staffId: 'st2',
    } as any);

    expect(out.slots.length).toBeGreaterThan(0);
    expect(new Set(out.slots.map(s => s.staffId))).toEqual(new Set(['st2']));
  });

  it('ajoute bufferMinutes à la durée', async () => {
    prisma.client.service.findUnique.mockResolvedValueOnce({
      id: 'svc1',
      durationMin: 20, // base 20
    });
    prisma.client.staffAvailability.findMany.mockResolvedValueOnce([
      { id: 'av1', staffId: 'st1', startTime: '09:00', endTime: '10:00' },
    ]);
    prisma.client.appointment.findMany.mockResolvedValueOnce([]);

    // duration = 20 + buffer(10) = 30 => mêmes 3 slots que plus haut
    const out = await service.day({
      date: '2025-08-22',
      serviceId: 'svc1',
      bufferMinutes: 10,
    } as any);

    expect(out.slots.length).toBe(3);
  });
});
