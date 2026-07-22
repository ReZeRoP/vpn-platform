import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  AddInventoryDto,
  CreateOrderDto,
  ReviewOrderDto,
} from './dto/store.dto';

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  // ---------------- helpers: Decimal → number ----------------
  private toPlan(p: any) {
    return { ...p, price: Number(p.price) };
  }

  private toOrder(o: any) {
    return {
      ...o,
      amount: Number(o.amount),
      discount: Number(o.discount),
      plan: o.plan ? { title: o.plan.title, durationDays: o.plan.durationDays } : undefined,
      fulfilledConfig: o.fulfilledConfig ?? undefined,
      user: o.user ?? undefined,
    };
  }

  // ---------------- PLANS (public) ----------------
  async listPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return Promise.all(
      plans.map(async (p) => ({
        ...this.toPlan(p),
        stock: await this.prisma.configInventory.count({
          where: { planId: p.id, status: 'AVAILABLE' },
        }),
      })),
    );
  }

  // ---------------- PLANS (admin) ----------------
  async createPlan(dto: CreatePlanDto) {
    const plan = await this.prisma.plan.create({
      data: {
        title: dto.title,
        description: dto.description,
        durationDays: dto.durationDays,
        dataLimitGb: dto.dataLimitGb ?? null,
        price: dto.price,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
      },
    });
    return this.toPlan(plan);
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.ensurePlan(id);
    const plan = await this.prisma.plan.update({ where: { id }, data: dto });
    return this.toPlan(plan);
  }

  async adminListPlans() {
    const plans = await this.prisma.plan.findMany({ orderBy: { createdAt: 'desc' } });
    return Promise.all(
      plans.map(async (p) => {
        const [available, sold] = await Promise.all([
          this.prisma.configInventory.count({ where: { planId: p.id, status: 'AVAILABLE' } }),
          this.prisma.configInventory.count({ where: { planId: p.id, status: 'SOLD' } }),
        ]);
        return { ...this.toPlan(p), stock: available, sold, lowStock: available <= p.lowStockThreshold };
      }),
    );
  }

  // ---------------- INVENTORY (admin) ----------------
  async addInventory(planId: string, dto: AddInventoryDto) {
    await this.ensurePlan(planId);
    const cleaned = dto.configs.map((c) => c.trim()).filter((c) => c.length > 0);
    if (cleaned.length === 0) throw new BadRequestException('هیچ لینکی وارد نشده است');

    const result = await this.prisma.configInventory.createMany({
      data: cleaned.map((configString) => ({
        planId,
        configString,
        configType: dto.configType ?? 'SUBSCRIPTION',
        status: 'AVAILABLE' as const,
      })),
    });
    return { added: result.count };
  }

  // ---------------- ORDERS (user) ----------------
  async createOrder(userId: string, dto: CreateOrderDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('پلن یافت نشد');

    let discount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      const valid =
        coupon &&
        coupon.isActive &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        (!coupon.maxUses || coupon.usedCount < coupon.maxUses);
      if (!valid) throw new BadRequestException('کد تخفیف نامعتبر است');
      couponId = coupon!.id;
      const price = Number(plan.price);
      discount = coupon!.percentOff
        ? Math.round((price * coupon!.percentOff) / 100)
        : Math.min(Number(coupon!.amountOff ?? 0), price);
    }

    const amount = Math.max(0, Number(plan.price) - discount);

    if (dto.paymentMethod === 'RECEIPT' && !dto.receiptUrl && !dto.transactionId) {
      throw new BadRequestException('رسید یا شناسه تراکنش لازم است');
    }

    if (dto.paymentMethod === 'WALLET') {
      return this.payWithWallet(userId, plan.id, amount, couponId);
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        planId: plan.id,
        status: 'PENDING',
        amount,
        discount,
        paymentMethod: 'RECEIPT',
        receiptUrl: dto.receiptUrl,
        transactionId: dto.transactionId,
        couponId,
      },
    });

    // Notify admin via Telegram (fire-and-forget, never blocks the response)
    this.notifyAdminReceipt(order.id, userId, plan.title, amount, dto.transactionId ?? null, dto.receiptUrl ?? null)
      .catch((err) => this.logger.warn(`Telegram notify failed: ${err.message}`));

    return this.toOrder(order);
  }

  private async notifyAdminReceipt(
    orderId: string,
    userId: string,
    planTitle: string,
    amount: number,
    transactionId: string | null,
    receiptUrl: string | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    await this.telegram.notifyNewReceiptOrder({
      orderId,
      username: user?.username ?? 'نامشخص',
      planTitle,
      amount,
      transactionId,
      receiptUrl,
    });
  }

  private async payWithWallet(userId: string, planId: string, amount: number, couponId?: string) {
    const fulfilled = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new BadRequestException('موجودی کیف پول کافی نیست');
      }
      const order = await tx.order.create({
        data: {
          userId,
          planId,
          status: 'APPROVED',
          amount,
          paymentMethod: 'WALLET',
          couponId,
          reviewedAt: new Date(),
        },
      });
      const newBalance = Number(wallet.balance) - amount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PURCHASE',
          amount: -amount,
          balanceAfter: newBalance,
          reference: order.id,
        },
      });
      const fulfilled = await this.fulfilInTx(tx, order.id, planId, userId);
      if (couponId) {
        await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      }
      return fulfilled;
    });
    return this.toOrder(fulfilled);
  }

  async myOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { title: true, durationDays: true } },
        fulfilledConfig: { select: { configString: true, configType: true } },
      },
    });
    return orders.map((o) => this.toOrder(o));
  }

  // ---------------- ORDERS (admin) ----------------
  async adminListOrders(status?: string) {
    const orders = await this.prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true } },
        plan: { select: { title: true } },
      },
    });
    return orders.map((o) => this.toOrder(o));
  }

  async reviewOrder(orderId: string, adminId: string, dto: ReviewOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    if (order.status !== 'PENDING') {
      throw new ConflictException('این سفارش قبلاً بررسی شده است');
    }

    if (dto.action === 'REJECT') {
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REJECTED',
          adminNote: dto.adminNote,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
      await this.prisma.notification.create({
        data: {
          userId: order.userId,
          type: 'ORDER_REJECTED',
          title: 'سفارش شما رد شد',
          body: dto.adminNote ?? 'متأسفانه سفارش شما توسط مدیریت رد شد.',
          data: { orderId },
        },
      });
      return this.toOrder(updated);
    }

    // APPROVE → atomic fulfillment
    const fulfilled = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'APPROVED',
          adminNote: dto.adminNote,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          userId: order.userId,
          type: 'ORDER_APPROVED',
          title: 'سفارش شما تأیید شد',
          body: 'سفارش شما در حال آماده‌سازی است.',
          data: { orderId },
        },
      });
      const fulfilled = await this.fulfilInTx(tx, orderId, order.planId, order.userId);
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }
      return fulfilled;
    });
    return this.toOrder(fulfilled);
  }

  private async fulfilInTx(tx: PrismaTx, orderId: string, planId: string, userId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "ConfigInventory"
      WHERE "planId" = ${planId} AND "status" = 'AVAILABLE'
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;
    if (rows.length === 0) {
      throw new ConflictException('موجودی این پلن تمام شده است؛ سفارش تأیید نشد');
    }
    const configId = rows[0].id;
    const plan = await tx.plan.findUnique({ where: { id: planId } });
    const expiresAt = new Date(Date.now() + (plan?.durationDays ?? 30) * 24 * 60 * 60 * 1000);

    await tx.configInventory.update({
      where: { id: configId },
      data: { status: 'SOLD', orderId, soldAt: new Date() },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'FULFILLED', expiresAt },
    });
    await tx.notification.create({
      data: {
        userId,
        type: 'CONFIG_DELIVERED',
        title: 'کانفیگ شما آماده است',
        body: 'سفارش شما تأیید و کانفیگ تحویل داده شد.',
        data: { orderId },
      },
    });

    return tx.order.findUnique({
      where: { id: orderId },
      include: { fulfilledConfig: { select: { configString: true, configType: true } } },
    });
  }

  private async ensurePlan(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('پلن یافت نشد');
    return plan;
  }
}

type PrismaTx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
