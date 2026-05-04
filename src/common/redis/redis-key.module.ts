import { Global, Module } from '@nestjs/common';
import { RedisKeyService } from './redis-key.service';

@Global()
@Module({
  providers: [RedisKeyService],
  exports: [RedisKeyService],
})
export class RedisKeyModule {}
