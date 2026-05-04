import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisKeyModule } from './common/redis/redis-key.module';

@Module({
  imports: [RedisKeyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
