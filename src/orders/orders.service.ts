import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, OrderItemDto } from './dto/checkout.dto';
import { HubtelService } from '../hubtel/hubtel.service';
import { randomUUID } from 'crypto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hubtel: HubtelService,
  ) {}

  // ─── Checkout ─────────────────────────────────────────────────────────────

  async checkout(dto: CheckoutDto) {
    // 1. Validate all items & calculate total
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
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== product.id) {
          throw new BadRequestException(
            `Variant ${item.variantId} is not valid for ${product.name}`,
          );
        }
        unitPesewas = variant.priceInPesewas;
        variantLabel = variant.label;
      } else {
        if (product.priceInPesewas === null) {
          throw new BadRequestException(
            `${product.name} requires a variant selection`,
          );
        }
        unitPesewas = product.priceInPesewas;
      }

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

    // 2. Call Hubtel FIRST — no DB writes until Hubtel accepts
    const totalGhs = orderTotalPesewas / 100;
    const clientReference = randomUUID().replace(/-/g, '').slice(0, 32);

    const hubtelResult = await this.hubtel.initiateCheckout({
      totalAmount: totalGhs,
      description: `Bubble Bliss Order`,
      clientReference,
      callbackUrl:
        process.env.HUBTEL_CALLBACK_URL ??
        'https://PLACEHOLDER.example.com/orders/callback',
      returnUrl:
        process.env.HUBTEL_RETURN_URL ??
        'https://PLACEHOLDER.example.com/payment/success',
      cancellationUrl:
        process.env.HUBTEL_CANCEL_URL ??
        'https://PLACEHOLDER.example.com/payment/cancelled',
      merchantAccountNumber: process.env.HUBTEL_MERCHANT_ACCOUNT ?? '',
      payeeMobileNumber: dto.phone,
      payeeName: dto.payeeName,
      payeeEmail: dto.payeeEmail,
    });

    // 3. Hubtel accepted — now save the order as pending/unpaid
    const order = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.order.create({
          data: {
            phone: dto.phone,
            locationText: dto.locationText,
            notes: dto.notes ?? null,
            totalPesewas: orderTotalPesewas,
            status: 'pending',
            paymentStatus: 'unpaid',
            clientReference,
            hubtelCheckoutId: hubtelResult.checkoutId,
          },
        });

        const orderItems = await Promise.all(
          preparedItems.map((item) =>
            tx.orderItem.create({
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
            }),
          ),
        );

        const allToppings = orderItems.flatMap((orderItem, idx) =>
          preparedItems[idx].toppings.map((t) => ({
            orderItemId: orderItem.id,
            toppingId: t.toppingId,
            toppingName: t.toppingName,
            toppingBasePesewas: t.toppingBasePesewas,
            priceAppliedPesewas: t.priceAppliedPesewas,
          })),
        );

        if (allToppings.length > 0) {
          await tx.orderItemTopping.createMany({ data: allToppings });
        }

        return created;
      },
      { timeout: 30000, maxWait: 30000 },
    );

    this.logger.log(
      `Order #${order.id} created, awaiting payment (ref: ${clientReference})`,
    );

    // 4. Return checkout URLs to the frontend
    return {
      orderId: order.id,
      clientReference,
      totalGhs,
      totalPesewas: orderTotalPesewas,
      checkoutUrl: hubtelResult.checkoutUrl,
      checkoutDirectUrl: hubtelResult.checkoutDirectUrl,
      message: 'Proceed to payment.',
    };
  }

  // ─── Hubtel Payment Callback ───────────────────────────────────────────────

  async handlePaymentCallback(body: any) {
    this.logger.log(`Hubtel callback received: ${JSON.stringify(body)}`);

    const data = body?.Data ?? body?.data;
    if (!data) {
      this.logger.warn('Callback received with no data payload');
      return { received: true };
    }

    const clientReference = data.ClientReference ?? data.clientReference;
    const status = data.Status ?? data.status;
    const amount = data.Amount ?? data.amount;
    const customerPhone = data.CustomerPhoneNumber ?? data.customerPhoneNumber;

    if (!clientReference) {
      this.logger.warn('Callback missing clientReference');
      return { received: true };
    }

    const order = await this.prisma.order.findUnique({
      where: { clientReference },
    });

    if (!order) {
      this.logger.warn(`Callback for unknown clientReference: ${clientReference}`);
      return { received: true };
    }

    // Ignore duplicate callbacks — order already processed
    if (order.paymentStatus === 'paid') {
      this.logger.log(`Order #${order.id} already marked paid, skipping`);
      return { received: true };
    }

    if (status === 'Success') {
      // Mark order as paid and confirmed
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed',
        },
      });

      this.logger.log(`Order #${order.id} marked as paid`);

      // Send confirmation SMS to customer
      const totalGhs = (amount ?? order.totalPesewas / 100).toFixed(2);
      const phone = customerPhone ?? order.phone;
      const smsMessage =
        `Thank you for your order at Bubble Bliss! 🫧\n` +
        `Order #${order.id} confirmed — GHS ${totalGhs}.\n` +
        `We'll have it ready for you soon!`;

      await this.hubtel.sendSms(phone, smsMessage);
    } else {
      // Payment failed or was cancelled — mark order accordingly
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'failed',
          status: 'cancelled',
        },
      });

      this.logger.warn(`Order #${order.id} payment failed (status: ${status})`);
    }

    return { received: true };
  }

  // ─── Status Check ──────────────────────────────────────────────────────────

  async getOrderStatus(clientReference: string) {
    const order = await this.prisma.order.findUnique({
      where: { clientReference },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalPesewas: true,
        createdAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalGhs: order.totalPesewas / 100,
      createdAt: order.createdAt,
    };
  }
}
