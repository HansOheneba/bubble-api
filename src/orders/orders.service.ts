import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, OrderItemDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(dto: CheckoutDto) {
    const productIds = dto.items.map((i) => i.productId);
    const variantIds = dto.items.flatMap((i) =>
      i.variantId ? [i.variantId] : [],
    );
    const toppingIds = dto.items.flatMap((i) =>
      i.toppings.map((t) => t.toppingId),
    );

    const [products, variants, toppings] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } } }),
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
      }),
      this.prisma.topping.findMany({ where: { id: { in: toppingIds } } }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const toppingMap = new Map(toppings.map((t) => [t.id, t]));

    let orderTotalPesewas = 0;

    const preparedItems = dto.items.map((item: OrderItemDto) => {
      const product = productMap.get(item.productId);
      if (!product)
        throw new BadRequestException(`Product ${item.productId} not found`);
      if (!product.isActive)
        throw new BadRequestException(`${product.name} is not available`);
      if (!product.inStock)
        throw new BadRequestException(`${product.name} is out of stock`);

      let unitPesewas: number;
      let variantLabel: string | null = null;

      if (item.variantId) {
        // shawarma — price comes from the variant
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== product.id) {
          throw new BadRequestException(
            `Variant ${item.variantId} is not valid for ${product.name}`,
          );
        }
        unitPesewas = variant.priceInPesewas;
        variantLabel = variant.label;
      } else {
        // drink or single-price item — price comes from the product
        if (product.priceInPesewas === null) {
          throw new BadRequestException(
            `${product.name} requires a variant selection`,
          );
        }
        unitPesewas = product.priceInPesewas;
      }

      // first topping per item is free
      const itemToppings = item.toppings.map((t, idx) => {
        const topping = toppingMap.get(t.toppingId);
        if (!topping)
          throw new BadRequestException(`Topping ${t.toppingId} not found`);
        if (!topping.isActive)
          throw new BadRequestException(
            `Topping "${topping.name}" is not available`,
          );
        if (!topping.inStock)
          throw new BadRequestException(
            `Topping "${topping.name}" is out of stock`,
          );
        const basePesewas = topping.priceInPesewas;
        return {
          toppingId: topping.id,
          toppingName: topping.name,
          toppingBasePesewas: basePesewas,
          priceAppliedPesewas: idx === 0 ? 0 : basePesewas,
        };
      });

      const toppingsTotalPesewas = itemToppings.reduce(
        (sum, t) => sum + t.priceAppliedPesewas,
        0,
      );
      orderTotalPesewas += (unitPesewas + toppingsTotalPesewas) * item.quantity;

      return {
        productId: product.id,
        variantId: item.variantId ?? null,
        productName: product.name,
        variantLabel,
        unitPesewas,
        quantity: item.quantity,
        sugarLevel: item.sugarLevel ?? null,
        spiceLevel: item.spiceLevel ?? null,
        note: item.note ?? null,
        toppings: itemToppings,
      };
    });

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          phone: dto.phone,
          locationText: dto.locationText,
          notes: dto.notes ?? null,
          totalPesewas: orderTotalPesewas,
          status: 'pending',
          paymentStatus: 'unpaid',
        },
      });

      for (const item of preparedItems) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantLabel: item.variantLabel,
            unitPesewas: item.unitPesewas,
            quantity: item.quantity,
            sugarLevel: item.sugarLevel,
            spiceLevel: item.spiceLevel,
            note: item.note,
          },
        });

        for (const t of item.toppings) {
          await tx.orderItemTopping.create({
            data: {
              orderItemId: orderItem.id,
              toppingId: t.toppingId,
              toppingName: t.toppingName,
              toppingBasePesewas: t.toppingBasePesewas,
              priceAppliedPesewas: t.priceAppliedPesewas,
            },
          });
        }
      }

      return created;
    });

    return {
      orderId: order.id,
      status: order.status,
      totalGhs: orderTotalPesewas / 100, // convert back to GHS for response
      totalPesewas: orderTotalPesewas,
      message: 'Order placed successfully',
    };
  }
}
