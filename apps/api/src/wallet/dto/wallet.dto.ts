import { IsInt, IsString, MaxLength, MinLength, NotEquals } from 'class-validator';

export class AdjustWalletDto {
  @IsInt()
  @NotEquals(0)
  amount!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  note!: string;
}
