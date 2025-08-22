import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AppointmentStatus, User } from '@prisma/client';
import { FinalizeProfileDto } from 'src/auth/dto/finalize-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // async create(dto: CreateUserDto) {
  //   return this.prisma.client.user.create({
  //     data: {
  //       email: dto.email,
  //       phone: dto.phone,
  //       firstName: dto.firstName,
  //       lastName: dto.lastName,
  //       role: dto.role ?? Role.CUSTOMER,
  //     },
  //   });
  // }

  findAll() {
    return this.prisma.client.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    return await this.prisma.client.user.update({
      where: { id },
      data: dto,
    });
  }

  // async remove(id: string) {
  //   await this.prisma.client.user.delete({ where: { id } });
  //   return { id, deleted: true };
  // }
  async remove(id: string) {
    const now = new Date();

    return this.prisma.client.$transaction(async (tx) => {
      // Annuler RDV futurs où il est staff
      await tx.appointment.updateMany({
        where: {
          staffId: id,
          startAt: { gt: now },
          status: { not: AppointmentStatus.CANCELLED },
        },
        data: {
          status: AppointmentStatus.CANCELLED,
        },
      });

      // Annuler RDV futurs où il est client
      await tx.appointment.updateMany({
        where: {
          customerId: id,
          startAt: { gt: now },
          status: { not: AppointmentStatus.CANCELLED },
        },
        data: {
          status: AppointmentStatus.CANCELLED,
        },
      });

      // Delete user
      const deleted = await tx.user.delete({ where: { id } });

      return deleted;
    });
  }

  findByFirebaseUid(firebaseUid: string) {
    return this.prisma.client.user.findUnique({ where: { firebaseUid } });
  }

  async createFromFirebase(
    firebaseUid: string,
    emailFromToken: string,
    dto: FinalizeProfileDto,
  ) {
    const email = emailFromToken;

    // Éviter un doublon email≠uid (cas rare mais mieux d’être explicite)
    const existingByEmail: User | null =
      await this.prisma.client.user.findUnique({ where: { email } });
    if (existingByEmail && existingByEmail.firebaseUid !== firebaseUid) {
      throw new ConflictException('A user with this email already exists.');
    }

    const created: User = await this.prisma.client.user.create({
      data: {
        firebaseUid,
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });
    return created;
  }
}
