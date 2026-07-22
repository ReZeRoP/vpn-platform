import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OrderNotifyData {
  username: string;
  planTitle: string;
  amount: number;
  transactionId: string | null;
  receiptUrl: string | null;
  orderId: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token: string;
  private readonly chatId: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
    this.chatId = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID') ?? '';
  }

  get isEnabled(): boolean {
    return !!this.token && !!this.chatId;
  }

  async notifyNewReceiptOrder(data: OrderNotifyData): Promise<void> {
    if (!this.isEnabled) return;

    const webUrl = this.config.get<string>('WEB_URL') ?? '';
    const adminLink = webUrl ? `${webUrl}/admin` : '/admin';

    const lines = [
      '🚨 سفارش جدید (کارت به کارت)',
      '',
      `👤 کاربر: @${data.username}`,
      `📦 پلن: ${data.planTitle}`,
      `💰 مبلغ: ${data.amount.toLocaleString('fa-IR')} تومان`,
    ];
    if (data.transactionId) lines.push(`🔑 کد پیگیری: ${data.transactionId}`);
    if (data.receiptUrl && data.receiptUrl.startsWith('http')) {
      lines.push(`🧾 رسید: ${data.receiptUrl}`);
    } else {
      lines.push('🧾 رسید: در پنل مدیریت قابل مشاهده است');
    }
    lines.push('');
    lines.push(`🔗 بررسی و تأیید: ${adminLink}`);

    const text = lines.join('\n');

    try {
      const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`Telegram sendMessage failed (${res.status}): ${body}`);
      }
    } catch (err) {
      this.logger.warn(`Telegram notification error: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }
}
