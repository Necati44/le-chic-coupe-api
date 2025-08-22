import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { StaffAvailabilitiesService } from './staff-availabilities.service';
import { CreateStaffAvailabilityDto } from './dto/create-staff-availability.dto';
import { UpdateStaffAvailabilityDto } from './dto/update-staff-availability.dto';
import { QueryStaffAvailabilityDto } from './dto/query-staff-availability.dto';
import { BulkUpsertStaffAvailabilityDto } from './dto/bulk-upsert.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { logInfo } from '../common/logging/logger';

@Controller('staff-availabilities')
@UseGuards(FirebaseAuthGuard, RolesGuard) // tout est protégé et nécessite un rôle
@Roles(Role.OWNER, Role.STAFF)
export class StaffAvailabilityController {
  constructor(private readonly service: StaffAvailabilitiesService) {}

  /** STAFF: crée uniquement pour lui-même ;
   *  OWNER: peut créer pour n'importe quel staffId */
  @Post()
  async create(@Body() dto: CreateStaffAvailabilityDto, @Req() req: any) {
    const user = req.appUser;
    // si staff, forcer le staffId sur lui-même
    if (user.role === Role.STAFF) {
      (dto as any).staffId = user.id;
    }
    logInfo('staffAvailability.create', { byUserId: user.id, role: user.role, dtoKeys: Object.keys(dto || {}) });
    return this.service.create(dto);
  }

  /** Liste interne : OWNER/STAFF seulement */
  @Get()
  async findAll(@Query() q: QueryStaffAvailabilityDto, @Req() req: any) {
    const user = req.appUser;
    // Option: si role STAFF, limiter par défaut à ses dispos (décommente si tu veux)
    // if (user.role === Role.STAFF) (q as any).staffId = user.id;
    logInfo('staffAvailability.findAll', { byUserId: user.id, role: user.role, queryKeys: Object.keys(q || {}) });
    return this.service.findAll(q);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.appUser;
    const avail = await this.service.findOne(id);
    if (user.role === Role.STAFF && avail.staffId !== user.id) {
      throw new ForbiddenException('not_owner_of_availability');
    }
    logInfo('staffAvailability.findOne', { byUserId: user.id, role: user.role, availabilityId: id, staffId: avail.staffId });
    return avail;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffAvailabilityDto, @Req() req: any) {
    const user = req.appUser;
    const avail = await this.service.findOne(id);
    if (user.role === Role.STAFF && avail.staffId !== user.id) {
      throw new ForbiddenException('not_owner_of_availability');
    }
    // empêcher un STAFF de changer le staffId de la ressource
    if (user.role === Role.STAFF && (dto as any).staffId && (dto as any).staffId !== user.id) {
      throw new ForbiddenException('cannot_reassign_staffId');
    }
    logInfo('staffAvailability.update', { byUserId: user.id, role: user.role, availabilityId: id, fields: Object.keys(dto || {}) });
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.appUser;
    const avail = await this.service.findOne(id);
    if (user.role === Role.STAFF && avail.staffId !== user.id) {
      throw new ForbiddenException('not_owner_of_availability');
    }
    logInfo('staffAvailability.remove', { byUserId: user.id, role: user.role, availabilityId: id });
    return this.service.remove(id);
  }

  /** Remplacement complet des dispos d’un staff */
  @Put('bulk')
  async bulkUpsert(@Body() dto: BulkUpsertStaffAvailabilityDto, @Req() req: any) {
    const user = req.appUser;
    // STAFF: bulk uniquement sur lui-même
    if (user.role === Role.STAFF) {
      (dto as any).staffId = user.id;
    }
    logInfo('staffAvailability.bulkUpsert', { byUserId: user.id, role: user.role, staffId: (dto as any).staffId });
    return this.service.bulkUpsert(dto);
  }
}
