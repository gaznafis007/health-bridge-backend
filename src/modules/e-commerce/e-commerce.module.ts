import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { ECommerceController } from './e-commerce.controller';
import { ECommerceRepository } from './repositories/e-commerce.repository';
import { ECommerceService } from './e-commerce.service';
import { ECommerceStoreService } from './e-commerce-store.service';

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [ECommerceController],
  providers: [
    ECommerceRepository,
    ECommerceService,
    ECommerceStoreService,
  ],
  exports: [ECommerceService, ECommerceRepository],
})
export class ECommerceModule {}
