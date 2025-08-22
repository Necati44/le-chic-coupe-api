import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class QueryServiceDto {
  @IsOptional()
  @IsString()
  search?: string; // recherche sur name

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  skip?: number = 0;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => parseInt(value, 10))
  take?: number = 20;

  @IsOptional()
  @IsIn(['createdAt', 'name', 'priceCents', 'durationMin'])
  orderBy?: 'createdAt' | 'name' | 'priceCents' | 'durationMin' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc' = 'desc';
}
