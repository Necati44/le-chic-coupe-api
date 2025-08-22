// src/staff-availability/staff-availability.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { StaffAvailabilityController } from './staff-availabilities.controller';
import { StaffAvailabilitiesService } from './staff-availabilities.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [StaffAvailabilityController],
  providers: [StaffAvailabilitiesService],
  exports: [StaffAvailabilitiesService],
})
export class StaffAvailabilitiesModule {}
