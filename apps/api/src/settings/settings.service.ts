import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_KEYS = ['payment_card_number', 'payment_card_holder'] as const;

const DEFAULTS: Record<string, string> = {
  payment_card_number: '',
  payment_card_holder: '',
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key] ?? '';
  }

  async getMany(keys: string[]): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const key of keys) {
      const row = rows.find((r) => r.key === key);
      map[key] = row?.value ?? DEFAULTS[key] ?? '';
    }
    return map;
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    return map;
  }

  /** Returns only the settings safe to expose publicly (card details for checkout). */
  async getPublic(): Promise<{ cardNumber: string; cardHolder: string }> {
    const vals = await this.getMany([...PUBLIC_KEYS]);
    return {
      cardNumber: vals['payment_card_number'] ?? '',
      cardHolder: vals['payment_card_holder'] ?? '',
    };
  }

  async set(key: string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async setMany(entries: Record<string, string>): Promise<void> {
    await Promise.all(
      Object.entries(entries).map(([key, value]) => this.set(key, value)),
    );
  }

  async seed(): Promise<void> {
    const existing = await this.prisma.setting.findMany({ where: { key: { in: Object.keys(DEFAULTS) } } });
    const missing = Object.entries(DEFAULTS).filter(([key]) => !existing.some((r) => r.key === key));
    if (missing.length > 0) {
      await this.prisma.setting.createMany({ data: missing.map(([key, value]) => ({ key, value })) });
    }
  }
}
