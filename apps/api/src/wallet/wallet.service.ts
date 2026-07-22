import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@app/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('کیف پول یافت نشد');
    return { balance: Number(wallet.balance), updatedAt: wallet.updatedAt };
  }

  async transactions(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('کیف پول یافت نشد');
    const rows = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
      balanceAfter: Number(row.balanceAfter),
    }));
  }

  async adjust(userId: string, amount: number, note: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new NotFoundException('کاربر یافت نشد');
      await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: 0 },
      });

      const rows = await tx.$queryRaw<Array<{ id: string; balance: Prisma.Decimal }>>`
        SELECT id, balance FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE
      `;
      const wallet = rows[0];
      if (!wallet) throw new NotFoundException('کیف پول یافت نشد');
      const balanceAfter = Number(wallet.balance) + amount;
      if (balanceAfter < 0) throw new BadRequestException('موجودی کیف پول نمی‌تواند منفی شود');

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'ADMIN_ADJUST',
          amount,
          balanceAfter,
          reference: `${adminId}: ${note}`,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          type: amount > 0 ? 'WALLET_TOPUP' : 'SYSTEM',
          title: amount > 0 ? 'افزایش موجودی کیف پول' : 'اصلاح موجودی کیف پول',
          body: note,
          data: { transactionId: transaction.id, amount },
        },
      });
      return { balance: balanceAfter, transactionId: transaction.id };
    });
  }
}
