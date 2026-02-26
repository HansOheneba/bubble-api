import {
  Controller,
  Patch,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  Get,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { IsString, IsBoolean } from 'class-validator';

class ToggleStockDto {
  @IsBoolean()
  inStock: boolean;
}

class ToggleActiveDto {
  @IsBoolean()
  isActive: boolean;
}

class UpdateOrderStatusDto {
  @IsString()
  status: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /admin/orders */
  @Get('orders')
  getOrders() {
    return this.adminService.getOrders();
  }

  /** PATCH /admin/products/:id/stock — toggle inStock */
  @Patch('products/:id/stock')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  toggleProductStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleStockDto,
  ) {
    return this.adminService.toggleProductStock(id, dto.inStock);
  }

  /** PATCH /admin/products/:id/active — toggle isActive (show/hide from catalog) */
  @Patch('products/:id/active')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  toggleProductActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleActiveDto,
  ) {
    return this.adminService.toggleProductActive(id, dto.isActive);
  }

  /** PATCH /admin/toppings/:id/stock — toggle inStock */
  @Patch('toppings/:id/stock')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  toggleToppingStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleStockDto,
  ) {
    return this.adminService.toggleToppingStock(id, dto.inStock);
  }

  /** PATCH /admin/toppings/:id/active — toggle isActive */
  @Patch('toppings/:id/active')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  toggleToppingActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleActiveDto,
  ) {
    return this.adminService.toggleToppingActive(id, dto.isActive);
  }

  /** PATCH /admin/orders/:id/status */
  @Patch('orders/:id/status')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(id, dto.status);
  }
}
