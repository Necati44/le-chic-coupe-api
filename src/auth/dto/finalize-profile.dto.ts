import { IsNotEmpty, MaxLength } from 'class-validator';

export class FinalizeProfileDto {
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;
}
