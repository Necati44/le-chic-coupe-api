import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatus } from '@prisma/client';

export class ListAppointmentsDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() serviceId?: string;

  // Filtre par statut
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;

  // Fenêtre temporelle
  @IsOptional() @IsDateString() startFrom?: string;
  @IsOptional() @IsDateString() endTo?: string;

  // Pagination
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) skip?: number = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) take?: number = 20;

  // Tri (par défaut: startAt asc)
  @IsOptional() @IsString() orderBy?: 'startAt'|'createdAt' = 'startAt';
  @IsOptional() @IsString() orderDir?: 'asc'|'desc' = 'asc';
}
