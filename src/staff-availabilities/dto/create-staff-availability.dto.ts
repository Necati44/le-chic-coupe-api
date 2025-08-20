import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Weekday } from '@prisma/client';

export class CreateStaffAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @IsEnum(Weekday)
  day!: Weekday;

  // format "HH:MM" 24h
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime!: string;
}
