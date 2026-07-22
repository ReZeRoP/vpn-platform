import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ArrayNotEmpty,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dataLimitGb?: number; // omit = unlimited

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class UpdatePlanDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) durationDays?: number;
  @IsOptional() @IsInt() @Min(0) dataLimitGb?: number;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
}

export enum ConfigTypeDto {
  VLESS = 'VLESS',
  VMESS = 'VMESS',
  WIREGUARD = 'WIREGUARD',
  TROJAN = 'TROJAN',
  SHADOWSOCKS = 'SHADOWSOCKS',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export class AddInventoryDto {
  // Inventory items are subscription links. Type is fixed to SUBSCRIPTION;
  // kept optional/overridable for future flexibility.
  @IsOptional()
  @IsEnum(ConfigTypeDto)
  configType?: ConfigTypeDto;

  // Bulk paste: one subscription link per array item.
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  configs!: string[];
}

export class CreateOrderDto {
  @IsString()
  planId!: string;

  @IsEnum(['RECEIPT', 'WALLET'])
  paymentMethod!: 'RECEIPT' | 'WALLET';

  @IsOptional()
  @IsString()
  receiptUrl?: string; // required-ish for RECEIPT; validated in service

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class ReviewOrderDto {
  @IsEnum(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  adminNote?: string;
}
