import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  ArrayMinSize,
  IsNotEmpty,
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
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  locationText: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
