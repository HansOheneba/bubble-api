import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsEmail,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderToppingDto {
  @IsInt()
  toppingId: number;
}

export class OrderItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @IsOptional()
  variantId?: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderToppingDto)
  toppings: OrderToppingDto[];

  @IsString()
  @IsOptional()
  sugarLevel?: string;

  @IsString()
  @IsOptional()
  spiceLevel?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class CheckoutDto {
  @IsString()
  phone: string;

  @IsString()
  locationText: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Optional Hubtel payee fields — passed through to Hubtel for pre-filling
  @IsString()
  @IsOptional()
  payeeName?: string;

  @IsEmail()
  @IsOptional()
  payeeEmail?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
