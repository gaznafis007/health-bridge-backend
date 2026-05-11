import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from './common/mail/mail.module';
import { RedisKeyModule } from './common/redis/redis-key.module';
import { StorageModule } from './common/storage/storage.module';
import { DatabaseModule } from './database/database.module';
import { AmbulanceModule } from './modules/ambulance/ambulance.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { AuthModule } from './modules/auth/auth.module';
import { ECommerceModule } from './modules/e-commerce/e-commerce.module';
import { LabTestModule } from './modules/lab-test/lab-test.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
    RedisKeyModule,
    DatabaseModule,
    StorageModule,
    MailModule,
    AuthModule,
    AppointmentModule,
    AmbulanceModule,
    ECommerceModule,
    LabTestModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
