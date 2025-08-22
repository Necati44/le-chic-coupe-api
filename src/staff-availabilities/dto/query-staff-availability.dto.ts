import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Weekday } from '@prisma/client';

export class QueryStaffAvailabilityDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsEnum(Weekday)
  day?: Weekday;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 20;
}
