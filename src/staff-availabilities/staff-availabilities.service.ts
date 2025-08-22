import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateStaffAvailabilityDto } from './dto/create-staff-availability.dto';
import { UpdateStaffAvailabilityDto } from './dto/update-staff-availability.dto';
import { QueryStaffAvailabilityDto } from './dto/query-staff-availability.dto';
import { BulkUpsertStaffAvailabilityDto } from './dto/bulk-upsert.dto';

function hasOverlap(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) {
  return a.startTime < b.endTime && a.endTime > b.startTime;
}

function assertNoOverlapInPayload(
  slots: Array<{ day: string; startTime: string; endTime: string }>,
) {
  // On vérifie par jour, trié par startTime, puis on compare les voisins
  const byDay: Record<string, Array<{ startTime: string; endTime: string }>> = {};
  for (const s of slots) {
    if (!byDay[s.day]) byDay[s.day] = [];
    byDay[s.day].push({ startTime: s.startTime, endTime: s.endTime });
  }
  for (const day of Object.keys(byDay)) {
    const list = byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < list.length; i++) {
      if (hasOverlap(list[i - 1], list[i])) {
        throw new Error(`Overlap detected for ${day} between ${list[i - 1].startTime}-${list[i - 1].endTime} et ${list[i].startTime}-${list[i].endTime}`);
      }
    }
  }
}

@Injectable()
export class StaffAvailabilitiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStaffAvailabilityDto) {
    if (dto.startTime >= dto.endTime) {
        throw new BadRequestException('startTime must be < endTime');
    }

    // 🔎 overlap DB : même staff + même day
    const conflict = await this.prisma.client.staffAvailability.findFirst({
        where: {
        staffId: dto.staffId,
        day: dto.day,
        AND: [{ startTime: { lt: dto.endTime } }, { endTime: { gt: dto.startTime } }],
        },
        select: { id: true, startTime: true, endTime: true },
    });
    if (conflict) {
        throw new BadRequestException(
        `Overlap with existing slot ${conflict.startTime}-${conflict.endTime}`,
        );
    }

    return this.prisma.client.staffAvailability.create({ data: dto });
  }


  async findAll(q: QueryStaffAvailabilityDto) {
    const where: Prisma.StaffAvailabilityWhereInput = {
      staffId: q.staffId,
      day: q.day,
    };
    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.staffAvailability.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: [{ staffId: 'asc' }, { day: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.client.staffAvailability.count({ where }),
    ]);
    return { items, total, skip: q.skip ?? 0, take: q.take ?? 20 };
  }

  async findOne(id: string) {
    const item = await this.prisma.client.staffAvailability.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Availability not found');
    return item;
  }

  async update(id: string, dto: UpdateStaffAvailabilityDto) {
    // Charger l’existant pour connaître staffId/day si absents du DTO
    const current = await this.prisma.client.staffAvailability.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Availability not found');

    const day = dto.day ?? (current as any).day;
    const startTime = dto.startTime ?? current.startTime;
    const endTime = dto.endTime ?? current.endTime;

    if (startTime >= endTime) {
        throw new BadRequestException('startTime must be < endTime');
    }

    // 🔎 overlap DB, en excluant l’enregistrement courant
    const conflict = await this.prisma.client.staffAvailability.findFirst({
        where: {
        id: { not: id },
        staffId: current.staffId,
        day,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
        },
        select: { id: true, startTime: true, endTime: true },
    });
    if (conflict) {
        throw new BadRequestException(
        `Overlap with existing slot ${conflict.startTime}-${conflict.endTime}`,
        );
    }

    try {
        return await this.prisma.client.staffAvailability.update({
        where: { id },
        data: { ...dto, day, startTime, endTime },
        });
    } catch {
        throw new NotFoundException('Availability not found');
    }
  }


  async remove(id: string) {
    try {
      await this.prisma.client.staffAvailability.delete({ where: { id } });
      return { id, deleted: true };
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException('Availability not found');
      throw e;
    }
  }

  /**
   * Remplace de façon atomique tous les créneaux d’un staff par ceux fournis.
   * Stratégie simple et lisible pour un MVP :
   *  - transaction: deleteMany(staffId) -> createMany(slots)
   *  - validations de base (cohérence staffId, ordre horaire)
   */
  async bulkUpsert(dto: BulkUpsertStaffAvailabilityDto) {
    // Validations de base
    for (const s of dto.slots) {
        if (s.staffId !== dto.staffId) {
        throw new BadRequestException('Tous les slots doivent avoir le même staffId');
        }
        if (s.startTime >= s.endTime) {
        throw new BadRequestException(`startTime < endTime requis pour ${s.day} ${s.startTime}-${s.endTime}`);
        }
    }

    // 🔒 Vérifier qu’aucun chevauchement n’existe dans les slots fournis
    try {
        assertNoOverlapInPayload(dto.slots);
    } catch (e: any) {
        throw new BadRequestException(e.message);
    }

    // Remplacement atomique
    return this.prisma.client.$transaction(async (tx) => {
        await tx.staffAvailability.deleteMany({ where: { staffId: dto.staffId } });
        if (dto.slots.length === 0) return [];

        await tx.staffAvailability.createMany({
        data: dto.slots.map(({ staffId, day, startTime, endTime }) => ({
            staffId, day, startTime, endTime,
        })),
        skipDuplicates: true,
        });

        return tx.staffAvailability.findMany({
        where: { staffId: dto.staffId },
        orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
        });
    });
  }
}
