import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, UpdateUserDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [users, pendingOrders, fulfilledOrders, availableStock, revenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'FULFILLED' } }),
      this.prisma.configInventory.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.order.aggregate({
        where: { status: 'FULFILLED' },
        _sum: { amount: true },
      }),
    ]);
    return {
      users,
      pendingOrders,
      fulfilledOrders,
      availableStock,
      revenue: Number(revenue._sum.amount ?? 0),
    };
  }

  async users(search?: string) {
    const rows = await this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { wallet: { select: { balance: true } }, _count: { select: { orders: true } } },
    });
    return rows.map((user) => ({
      id: user.id,
      username: user.username,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
      walletBalance: Number(user.wallet?.balance ?? 0),
      orderCount: user._count.orders,
    }));
  }

  async updateUser(id: string, adminId: string, dto: UpdateUserDto) {
    if (id === adminId && (dto.isBanned === true || dto.role === 'USER')) {
      throw new BadRequestException('نمی‌توانید دسترسی حساب خودتان را حذف کنید');
    }
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('کاربر یافت نشد');
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, username: true, role: true, isBanned: true },
    });
  }

  async coupons() {
    const rows = await this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row) => ({ ...row, amountOff: row.amountOff ? Number(row.amountOff) : null }));
  }

  async createCoupon(dto: CreateCouponDto) {
    this.validateDiscount(dto.percentOff, dto.amountOff);
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new ConflictException('این کد تخفیف قبلاً ثبت شده است');
    const coupon = await this.prisma.coupon.create({
      data: {
        code,
        percentOff: dto.percentOff,
        amountOff: dto.amountOff,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
    return { ...coupon, amountOff: coupon.amountOff ? Number(coupon.amountOff) : null };
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const current = await this.prisma.coupon.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('کد تخفیف یافت نشد');
    const percentOff = dto.percentOff ?? current.percentOff ?? undefined;
    const amountOff = dto.amountOff ?? (current.amountOff ? Number(current.amountOff) : undefined);
    this.validateDiscount(percentOff, amountOff);
    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        percentOff: dto.percentOff,
        amountOff: dto.amountOff,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive,
      },
    });
    return { ...coupon, amountOff: coupon.amountOff ? Number(coupon.amountOff) : null };
  }

  async deleteCoupon(id: string) {
    const deleted = await this.prisma.coupon.deleteMany({ where: { id } });
    if (deleted.count === 0) throw new NotFoundException('کد تخفیف یافت نشد');
    return { success: true };
  }

  private validateDiscount(percentOff?: number, amountOff?: number) {
    if (!!percentOff === !!amountOff) {
      throw new BadRequestException('دقیقاً یکی از درصد یا مبلغ تخفیف را وارد کنید');
    }
  }
}
