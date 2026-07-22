import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  async onModuleInit() {
    await this.seedSettings();
    await this.ensureGlobalChat();
    await this.ensureAdmin();
  }

  private async seedSettings() {
    await this.settings.seed();
    this.logger.log('Settings seeded');
  }

  private async ensureGlobalChat() {
    await this.prisma.conversation.upsert({
      where: { id: 'global-chat' },
      update: {},
      create: { id: 'global-chat', type: 'GLOBAL', title: 'چت عمومی' },
    });
  }

  private async ensureAdmin() {
    const username = this.config.get<string>('ADMIN_USERNAME')?.trim();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!username || !password) {
      this.logger.warn('ADMIN_USERNAME/ADMIN_PASSWORD not set; automatic admin bootstrap skipped');
      return;
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      if (existing.role !== 'ADMIN') {
        await this.prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
        this.logger.log(`Promoted existing user ${username} to ADMIN`);
      }
      return;
    }

    await this.prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
        referralCode: `ADMIN-${randomBytes(4).toString('hex').toUpperCase()}`,
        wallet: { create: { balance: 0 } },
      },
    });
    this.logger.log(`Created initial admin user ${username}`);
  }
}
