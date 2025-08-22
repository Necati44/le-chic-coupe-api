import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { logInfo } from '../common/logging/logger';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // PUBLIC: catalogue visible par tout le monde
  @Get()
  async findAll(@Query() q: QueryServiceDto) {
    logInfo('services.findAll', { queryKeys: Object.keys(q || {}) });
    return this.servicesService.findAll(q);
  }

  // PUBLIC
  @Get(':id')
  async findOne(@Param('id') id: string) {
    logInfo('services.findOne', { serviceId: id });
    return this.servicesService.findOne(id);
  }

  // ADMIN/STAFF: créer un service
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.STAFF)
  @Post()
  async create(@Body() dto: CreateServiceDto, @Req() req: any) {
    const user = req.appUser;
    logInfo('services.create', { byUserId: user?.id, role: user?.role, dtoKeys: Object.keys(dto || {}) });
    return this.servicesService.create(dto);
  }

  // ADMIN/STAFF: modifier un service
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.STAFF)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto, @Req() req: any) {
    const user = req.appUser;
    logInfo('services.update', { byUserId: user?.id, role: user?.role, serviceId: id, fields: Object.keys(dto || {}) });
    return this.servicesService.update(id, dto);
  }

  // OWNER: supprimer un service
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.appUser;
    logInfo('services.remove', { byUserId: user?.id, role: user?.role, serviceId: id });
    return this.servicesService.remove(id);
  }
}
