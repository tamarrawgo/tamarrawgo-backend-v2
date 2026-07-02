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
    this.senderName = this.config.get('SMS_SENDER_NAME', '');
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const message = `Your TamarrawGo verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

    if (!this.apiKey || this.apiKey === 'your-sms-api-key') {
      this.logger.warn(`[SMS DISABLED] OTP for ${phone}: ${otp}`);
      return;
    }

    try {
      const payload: any = { apikey: this.apiKey, number: phone, message };
      if (this.senderName) payload.sendername = this.senderName;

      const response = await axios.post('https://api.semaphore.co/api/v4/messages', payload);

      this.logger.log(`[SMS] OTP sent to ${phone} — status: ${response.data?.status ?? 'sent'}`);
    } catch (err: any) {
      const detail = err?.response?.data ? JSON.stringify(err.response.data) : err?.message;
      this.logger.error(`[SMS] Failed to send OTP to ${phone}: ${detail}`);
    }
  }
}
