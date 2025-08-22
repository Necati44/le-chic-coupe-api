// src/staff-availability/staff-availability.module.ts
import { Module } from '@nestjs/common';
import { StaffAvailabilityController } from './staff-availabilities.controller';
import { StaffAvailabilitiesService } from './staff-availabilities.service';

@Module({
  controllers: [StaffAvailabilityController],
  providers: [StaffAvailabilitiesService],
  exports: [StaffAvailabilitiesService],
})
export class StaffAvailabilitiesModule {}
