import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
import { StaffAvailabilitiesService } from './staff-availabilities.service';
import { CreateStaffAvailabilityDto } from './dto/create-staff-availability.dto';
import { UpdateStaffAvailabilityDto } from './dto/update-staff-availability.dto';
import { QueryStaffAvailabilityDto } from './dto/query-staff-availability.dto';
import { BulkUpsertStaffAvailabilityDto } from './dto/bulk-upsert.dto';

@Controller('staff-availabilities')
export class StaffAvailabilityController {
  constructor(private readonly service: StaffAvailabilitiesService) {}

  @Post()
  create(@Body() dto: CreateStaffAvailabilityDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() q: QueryStaffAvailabilityDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffAvailabilityDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  /** Remplacement complet des dispos d’un staff */
  @Put('bulk')
  bulkUpsert(@Body() dto: BulkUpsertStaffAvailabilityDto) {
    return this.service.bulkUpsert(dto);
  }
}
