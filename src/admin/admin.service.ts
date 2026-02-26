import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VALID_STATUSES = [
  'pending',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
];

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleProductStock(id: number, inStock: boolean) {
    return this.prisma.product.update({ where: { id }, data: { inStock } });
  }

  async toggleProductActive(id: number, isActive: boolean) {
    return this.prisma.product.update({ where: { id }, data: { isActive } });
  }

  async toggleToppingActive(id: number, isActive: boolean) {
    return this.prisma.topping.update({ where: { id }, data: { isActive } });
  }

  async toggleToppingStock(id: number, inStock: boolean) {
    return this.prisma.topping.update({ where: { id }, data: { inStock } });
  }

  async updateOrderStatus(id: number, status: string) {
    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestException(
        `status must be one of: ${VALID_STATUSES.join(', ')}`,
      );
    }
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  async getOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { toppings: true, variant: true } } },
    });
  }
}
