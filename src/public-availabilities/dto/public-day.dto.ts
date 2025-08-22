import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class PublicDayQueryDto {
  /** Date du jour à explorer (YYYY-MM-DD) */
  @IsString()
  date!: string;

  /** UUID du service (pour connaître sa durée) */
  @IsString()
  serviceId!: string;

  /** Facultatif: forcer un staff précis, sinon tous */
  @IsOptional()
  @IsString()
  staffId?: string;

  /** Pas des créneaux en minutes (par défaut 15) */
  @IsOptional()
  @IsInt()
  @Min(5)
  stepMinutes?: number;

  /** Buffer en minutes à ajouter après la durée du service (par défaut 0) */
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMinutes?: number;
}
