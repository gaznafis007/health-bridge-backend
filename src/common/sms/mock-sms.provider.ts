import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from './providers/sms-provider.interface';

@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async sendOtp(phone: string, message: string): Promise<void> {
    this.logger.log(`[MockSMS] to=${phone} message=${message}`);
  }
}
