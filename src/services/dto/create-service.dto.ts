import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(1)
  durationMin!: number;

  // En centimes pour éviter les flottants (ex: 25,90€ => 2590)
  @IsInt()
  @Min(0)
  priceCents!: number;
}
