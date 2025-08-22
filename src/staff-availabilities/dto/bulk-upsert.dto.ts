import {
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStaffAvailabilityDto } from './create-staff-availability.dto';

export class BulkUpsertStaffAvailabilityDto {
  @IsString()
  staffId!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CreateStaffAvailabilityDto)
  slots!: CreateStaffAvailabilityDto[]; // tous pour ce staffId
}
