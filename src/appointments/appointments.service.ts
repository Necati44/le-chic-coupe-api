import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { AppointmentStatus, Prisma } from '@prisma/client';

// TODO: ajouter des vérifs métier pour :
// - chevauchement de créneaux (pratique mais pas obligatoire)
// - disponibilité du staff (suffit de pas montrer de créneaux
// avec le staff, mais reste un + pour la sécurité)
// - pas possible de changer de créneaux 24h avant la date start

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    // Vérif: end > start
    if (new Date(dto.endAt) <= new Date(dto.startAt)) {
      throw new BadRequestException('endAt must be after startAt');
    }
    return this.prisma.client.appointment.create({
      data: {
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: dto.status ?? AppointmentStatus.PENDING,
        serviceId: dto.serviceId,
        customerId: dto.customerId,
        staffId: dto.staffId ?? null,
      },
    });
  }

  async findMany(q: ListAppointmentsDto) {
    const where: Prisma.AppointmentWhereInput = {
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.staffId && { staffId: q.staffId }),
      ...(q.serviceId && { serviceId: q.serviceId }),
      ...(q.status && { status: q.status as any }),
      ...(q.startFrom || q.endTo
        ? {
            AND: [
              q.startFrom ? { startAt: { gte: new Date(q.startFrom) } } : {},
              q.endTo ? { endAt: { lte: new Date(q.endTo) } } : {},
            ],
          }
        : {}),
    };

    const orderBy: Prisma.AppointmentOrderByWithRelationInput = {
      [q.orderBy ?? 'startAt']: q.orderDir ?? 'asc',
    };

    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.appointment.findMany({
        where,
        orderBy,
        skip: q.skip ?? 0,
        take: q.take ?? 20,
        include: {
          service: true,
          customer: { select: { id: true, firstName: true, lastName: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.client.appointment.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const appt = await this.prisma.client.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    if (dto.startAt && dto.endAt) {
      if (new Date(dto.endAt) <= new Date(dto.startAt)) {
        throw new BadRequestException('endAt must be after startAt');
      }
    }
    return this.prisma.client.appointment.update({
      where: { id },
      data: {
        ...(dto.startAt && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt && { endAt: new Date(dto.endAt) }),
        ...(dto.status && { status: dto.status as any }),
        ...(dto.serviceId && { serviceId: dto.serviceId }),
        ...(dto.customerId && { customerId: dto.customerId }),
        ...(dto.staffId !== undefined && { staffId: dto.staffId }),
      },
    });
  }

  // “Suppression” dure (pour la démo).
  async remove(id: string) {
    try {
      await this.prisma.client.appointment.delete({ where: { id } });
      return { id, deleted: true };
    } catch {
      throw new NotFoundException('Appointment not found');
    }
  }

  // Helper pratique : annuler
  async cancel(id: string) {
    return this.prisma.client.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED as any },
    });
  }
}
