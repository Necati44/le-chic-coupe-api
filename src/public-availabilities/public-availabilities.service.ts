import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicDayQueryDto } from './dto/public-day.dto';
import { logInfo } from '../common/logging/logger';
import { Weekday } from '@prisma/client';

// combine "YYYY-MM-DD" + "HH:mm" (heure locale Europe/Paris) en ISO
function toLocalIso(date: string, hhmm: string) {
  return `${date}T${hhmm}:00`;
}

function addMinutes(isoLocal: string, minutes: number) {
  const d = new Date(isoLocal);
  return new Date(d.getTime() + minutes * 60000).toISOString();
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart;
}

@Injectable()
export class PublicAvailabilitiesService {
  constructor(private prisma: PrismaService) {}

  async day(q: PublicDayQueryDto) {
    const step = q.stepMinutes ?? 15;
    const buffer = q.bufferMinutes ?? 0;

    // service (durée)
    const service = await this.prisma.client.service.findUnique({ where: { id: q.serviceId }});
    if (!service) throw new NotFoundException('service_not_found');
    const duration = service.durationMin + buffer;

    // weekday
    const jsDay = new Date(`${q.date}T12:00:00`).getDay(); // midi pour éviter soucis DST
    const weekday = Weekday[jsDay];

    // staff ciblé (ou tous)
    const staffFilter = q.staffId ? { staffId: q.staffId } : {};

    // dispos hebdo qui matchent ce weekday
    const avails = await this.prisma.client.staffAvailability.findMany({
      where: { day: weekday, ...staffFilter },
      select: { id: true, staffId: true, startTime: true, endTime: true }, // startTime/endTime "HH:mm"
    });

    if (avails.length === 0) {
      logInfo('public_avail.no_availabilities', { date: q.date, weekday, staffId: q.staffId ?? null });
      return { date: q.date, weekday, slots: [] };
    }

    // RDV existants ce jour-là pour ces staffs
    const staffIds = Array.from(new Set(avails.map(a => a.staffId)));
    const dayStart = `${q.date}T00:00:00`;
    const dayEnd   = `${q.date}T23:59:59`;

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        staffId: { in: staffIds },
        startAt: { lt: new Date(dayEnd) },
        endAt:   { gt: new Date(dayStart) },
        status: { notIn: ['CANCELLED'] as any }, // adapte si autre enum
      },
      select: { id: true, staffId: true, startAt: true, endAt: true },
    });

    // génère les créneaux
    const slots: Array<{ staffId: string; start: string; end: string }> = [];

    for (const a of avails) {
      // fenêtre de dispo du staff (locale -> ISO)
      const winStartLocal = toLocalIso(q.date, a.startTime); // ex "2025-08-22T09:00:00"
      const winEndLocal   = toLocalIso(q.date, a.endTime);

      // on itère par pas de step
      for (let cur = new Date(winStartLocal); cur < new Date(winEndLocal); cur = new Date(cur.getTime() + step * 60000)) {
        const startISO = cur.toISOString();
        const endISO   = addMinutes(startISO, duration);

        // le créneau doit tenir ENTIEREMENT dans la fenêtre
        if (endISO > new Date(winEndLocal).toISOString()) break;

        // vérifier chevauchement RDV
        const apptsOfStaff = appointments.filter(p => p.staffId === a.staffId);
        const blocked = apptsOfStaff.some(p =>
          overlaps(startISO, endISO, p.startAt.toISOString(), p.endAt.toISOString())
        );
        if (!blocked) {
          slots.push({ staffId: a.staffId, start: startISO, end: endISO });
        }
      }
    }

    logInfo('public_avail.day', {
      date: q.date, weekday, serviceId: q.serviceId, staffCount: staffIds.length, slotCount: slots.length,
    });

    // tu peux trier par staff puis heure
    slots.sort((s1, s2) => s1.staffId.localeCompare(s2.staffId) || s1.start.localeCompare(s2.start));
    return { date: q.date, weekday, serviceId: q.serviceId, slots };
  }
}
