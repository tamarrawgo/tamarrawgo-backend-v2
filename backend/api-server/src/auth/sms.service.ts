import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderName: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get('SMS_API_KEY', '');
    this.senderName = this.config.get('SMS_SENDER_NAME', 'TamarrawGo');
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const message = `Your TamarrawGo verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

    if (!this.apiKey || this.apiKey === 'your-sms-api-key') {
      // Dev fallback — log OTP to console
      this.logger.warn(`[SMS DISABLED] OTP for ${phone}: ${otp}`);
      return;
    }

    try {
      const response = await axios.post('https://api.semaphore.co/api/v4/messages', {
        apikey: this.apiKey,
        number: phone,
        message,
        sendername: this.senderName,
      });

      this.logger.log(`[SMS] OTP sent to ${phone} — status: ${response.data?.status ?? 'sent'}`);
    } catch (err: any) {
      this.logger.error(`[SMS] Failed to send OTP to ${phone}: ${err?.message}`);
      // Don't throw — log and continue (OTP still saved in DB for manual lookup)
    }
  }
}
