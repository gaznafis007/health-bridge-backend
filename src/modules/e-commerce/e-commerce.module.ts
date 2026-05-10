import { Module } from '@nestjs/common';
import { ECommerceController } from './e-commerce.controller';
import { ECommerceRepository } from './repositories/e-commerce.repository';
import { ECommerceService } from './e-commerce.service';
import { ECommerceStoreService } from './e-commerce-store.service';

@Module({
  controllers: [ECommerceController],
  providers: [
    ECommerceRepository,
    ECommerceService,
    ECommerceStoreService,
  ],
})
export class ECommerceModule {}
