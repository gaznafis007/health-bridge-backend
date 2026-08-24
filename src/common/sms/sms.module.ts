import { Global, Module } from '@nestjs/common';
import { MockSmsProvider } from './mock-sms.provider';
import { SMS_PROVIDER } from './providers/sms-provider.interface';

@Global()
@Module({
  providers: [
    MockSmsProvider,
    {
      provide: SMS_PROVIDER,
      useExisting: MockSmsProvider,
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
