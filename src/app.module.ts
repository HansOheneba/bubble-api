import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [PrismaModule, CatalogModule, OrdersModule, AuthModule, AdminModule],
})
export class AppModule {}
