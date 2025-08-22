import { IsNotEmpty, IsString } from "class-validator";

export class IdTokenByUidDto {
  @IsString() @IsNotEmpty()
  uid!: string;
}