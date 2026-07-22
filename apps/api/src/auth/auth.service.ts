import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private sha256(v: string) {
    return createHash('sha256').update(v).digest('hex');
  }

  private async signTokens(payload: JwtPayload) {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m',
    });
    // Opaque refresh token (random), stored hashed. Not a JWT — lets us revoke.
    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = Number((this.config.get('JWT_REFRESH_TTL') ?? '7d').replace('d', '')) || 7;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId: payload.sub, tokenHash: this.sha256(refreshToken), expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private genReferralCode() {
    return 'REF-' + randomBytes(4).toString('hex').toUpperCase();
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException('این نام کاربری قبلاً ثبت شده است');

    // Resolve referrer (optional) — never fail registration on a bad code.
    let referredById: string | undefined;
    if (dto.referralCode) {
      const ref = await this.prisma.user.findFirst({
        where: { referralCode: dto.referralCode },
        select: { id: true },
      });
      referredById = ref?.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user + wallet atomically; ensure a unique referral code.
    const user = await this.prisma.$transaction(async (tx) => {
      let referralCode = this.genReferralCode();
      // extremely unlikely collision, but guard anyway
      while (await tx.user.findFirst({ where: { referralCode }, select: { id: true } })) {
        referralCode = this.genReferralCode();
      }
      const created = await tx.user.create({
        data: {
          username: dto.username,
          passwordHash,
          referralCode,
          referredById,
          wallet: { create: { balance: 0 } },
        },
      });
      return created;
    });

    const tokens = await this.signTokens({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return { user: this.publicUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user) throw new UnauthorizedException('نام کاربری یا رمز عبور نادرست است');
    if (user.isBanned) throw new UnauthorizedException('حساب شما مسدود شده است');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('نام کاربری یا رمز عبور نادرست است');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    const tokens = await this.signTokens({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return { user: this.publicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('نشست نامعتبر است، دوباره وارد شوید');
    }

    // Rotate: revoke the used token, issue a fresh pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.signTokens({
      sub: stored.user.id,
      username: stored.user.username,
      role: stored.user.role,
    });
    return { user: this.publicUser(stored.user), ...tokens };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.sha256(refreshToken);
    await this.prisma.refreshToken
      .updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return {
      ...this.publicUser(user),
      walletBalance: Number(user.wallet?.balance ?? 0),
      referralCode: user.referralCode,
    };
  }

  private publicUser(user: {
    id: string;
    username: string;
    role: string;
    avatarUrl: string | null;
  }) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }
}
