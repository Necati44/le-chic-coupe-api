import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { logInfo } from '../common/logging/logger';

@Controller('appointments')
@UseGuards(FirebaseAuthGuard) // auth obligatoire sur tout le contrôleur
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @UseGuards(RolesGuard)
  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    const user = req.appUser;
    // CLIENT : ne peut créer que pour lui-même
    if (user.role === Role.CUSTOMER) {
      (dto as any).customerId = user.id;
    }
    logInfo('appointments.create', {
      byUserId: user.id,
      role: user.role,
      dtoKeys: Object.keys(dto || {}),
    });
    return this.appointmentsService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.STAFF)
  @Get()
  async list(@Query() q: ListAppointmentsDto, @Req() req: any) {
    const user = req.appUser;
    logInfo('appointments.list', {
      byUserId: user.id,
      role: user.role,
      queryKeys: Object.keys(q || {}),
    });
    return this.appointmentsService.findMany(q);
  }

  @UseGuards(RolesGuard)
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    const user = req.appUser;
    const appt = await this.appointmentsService.findOne(id);
    // CLIENT : uniquement ses propres RDV
    if (user.role === Role.CUSTOMER && appt.customerId !== user.id) {
      throw new ForbiddenException('insufficient_role_or_not_owner');
    }
    logInfo('appointments.get', {
      byUserId: user.id,
      role: user.role,
      apptId: id,
      customerId: appt.customerId,
    });
    return appt;
  }

  @UseGuards(RolesGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: any,
  ) {
    const user = req.appUser;
    const appt = await this.appointmentsService.findOne(id);
    // CLIENT : peut modifier seulement ses RDV
    if (user.role === Role.CUSTOMER && appt.customerId !== user.id) {
      throw new ForbiddenException('insufficient_role_or_not_owner');
    }
    logInfo('appointments.update', {
      byUserId: user.id,
      role: user.role,
      apptId: id,
      fields: Object.keys(dto || {}),
    });
    return this.appointmentsService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: any) {
    const user = req.appUser;
    const appt = await this.appointmentsService.findOne(id);
    // CLIENT : ne peut annuler que ses RDV
    if (user.role === Role.CUSTOMER && appt.customerId !== user.id) {
      throw new ForbiddenException('insufficient_role_or_not_owner');
    }
    logInfo('appointments.cancel', {
      byUserId: user.id,
      role: user.role,
      apptId: id,
    });
    return this.appointmentsService.cancel(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.STAFF)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.appUser;
    logInfo('appointments.remove', {
      byUserId: user.id,
      role: user.role,
      apptId: id,
    });
    return this.appointmentsService.remove(id);
  }
}
