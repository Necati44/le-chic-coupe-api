import { PartialType } from '@nestjs/mapped-types';
import { CreateStaffAvailabilityDto } from './create-staff-availability.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { Weekday } from '@prisma/client';

export class UpdateStaffAvailabilityDto extends PartialType(CreateStaffAvailabilityDto) {
  @IsOptional()
  @IsEnum(Weekday)
  day?: Weekday;
}
