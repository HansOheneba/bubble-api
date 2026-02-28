import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async checkout(@Body() dto: CheckoutDto) {
    return this.ordersService.checkout(dto);
  }

  // Hubtel POSTs to this when payment completes (success or failure)
  @Post('callback')
  @HttpCode(200)
  async handleCallback(@Body() body: any) {
    return this.ordersService.handlePaymentCallback(body);
  }

  // Frontend polls this after the iframe closes to know if payment went through
  @Get(':clientReference/status')
  async getStatus(@Param('clientReference') clientReference: string) {
    return this.ordersService.getOrderStatus(clientReference);
  }
}
