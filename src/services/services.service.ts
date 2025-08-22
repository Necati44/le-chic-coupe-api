import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    return this.prisma.client.service.create({ data: dto });
  }

  async findAll(q: QueryServiceDto) {
    const where = q.search
      ? { name: { contains: q.search, mode: 'insensitive' as const } }
      : undefined;

    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.service.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { [q.orderBy!]: q.orderDir },
      }),
      this.prisma.client.service.count({ where }),
    ]);

    return { items, total, skip: q.skip, take: q.take };
  }

  async findOne(id: string) {
    const service = await this.prisma.client.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    return await this.prisma.client.service.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    // suppression dure (pas de deletedAt dans ton modèle)
    await this.prisma.client.service.delete({ where: { id } });
    return { id, deleted: true };
  }
}
