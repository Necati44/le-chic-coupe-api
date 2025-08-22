import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicDayQueryDto } from './dto/public-day.dto';
import { logInfo } from '../common/logging/logger';
import { Weekday } from '@prisma/client';

// helpers UTC
const STEP_MS = 60_000;
function toUtc(date: string, hhmm: string) {
  // construit une date en UTC (ajout de 'Z')
  return new Date(`${date}T${hhmm}:00Z`);
}
function overlapsMs(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return aStart < bEnd && aEnd > bStart; // [start, end)
}

@Injectable()
export class PublicAvailabilitiesService {
  constructor(private prisma: PrismaService) {}

  async day(q: PublicDayQueryDto) {
    const step = (q.stepMinutes ?? 15) * STEP_MS;
    const buffer = q.bufferMinutes ?? 0;

    const service = await this.prisma.client.service.findUnique({
      where: { id: q.serviceId },
    });
    if (!service) throw new NotFoundException('service_not_found');
    const durationMs = ((service.durationMin + buffer) * STEP_MS) / 1; // minutes → ms

    const jsDay = new Date(`${q.date}T12:00:00Z`).getUTCDay();
    const weekday = Weekday[jsDay];
    const staffFilter = q.staffId ? { staffId: q.staffId } : {};

    const avails = await this.prisma.client.staffAvailability.findMany({
      where: { day: weekday, ...staffFilter },
      select: { staffId: true, startTime: true, endTime: true },
    });
    if (avails.length === 0) {
      return { date: q.date, weekday, slots: [] };
    }

    const staffIds = Array.from(new Set(avails.map((a) => a.staffId)));
    const dayStart = new Date(`${q.date}T00:00:00Z`);
    const dayEnd = new Date(`${q.date}T23:59:59Z`);
    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        staffId: { in: staffIds },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        status: { notIn: ['CANCELLED'] as any },
      },
      select: { staffId: true, startAt: true, endAt: true },
    });

    const slots: Array<{ staffId: string; start: string; end: string }> = [];

    for (const a of avails) {
      const winStart = toUtc(q.date, a.startTime).getTime();
      const winEnd = toUtc(q.date, a.endTime).getTime();

      for (let cur = winStart; cur < winEnd; cur += step) {
        const startMs = cur;
        const endMs = startMs + durationMs;

        // le créneau doit tenir entierement dans la fenêtre
        if (endMs > winEnd) break;

        const apptsOfStaff = appointments.filter(
          (p) => p.staffId === a.staffId,
        );
        const blocked = apptsOfStaff.some((p) =>
          overlapsMs(startMs, endMs, p.startAt.getTime(), p.endAt.getTime()),
        );

        if (!blocked) {
          slots.push({
            staffId: a.staffId,
            start: new Date(startMs).toISOString(),
            end: new Date(endMs).toISOString(),
          });
        }
      }
    }

    logInfo('public_avail.day', {
      date: q.date,
      weekday,
      serviceId: q.serviceId,
      staffCount: staffIds.length,
      slotCount: slots.length,
    });

    slots.sort(
      (s1, s2) =>
        s1.staffId.localeCompare(s2.staffId) ||
        s1.start.localeCompare(s2.start),
    );
    return { date: q.date, weekday, serviceId: q.serviceId, slots };
  }
}
