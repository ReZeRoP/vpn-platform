import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;
}

export class MessageCursorDto {
  @IsOptional()
  @IsString()
  beforeCreatedAt?: string;

  @IsOptional()
  @IsString()
  beforeId?: string;
}
