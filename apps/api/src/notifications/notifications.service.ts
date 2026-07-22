import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  count(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } }).then((count) => ({ count }));
  }

  async read(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (updated.count === 0) throw new NotFoundException('اعلان یافت نشد');
    return { success: true };
  }

  async readAll(userId: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: updated.count };
  }
}
