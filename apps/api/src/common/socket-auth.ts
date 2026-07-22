import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/jwt.strategy';

export interface SocketAuthUser {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
}

// Verify the JWT carried in the socket handshake `auth` payload.
export async function verifySocketAuth(
  auth: unknown,
  jwt: JwtService,
  config: ConfigService,
): Promise<SocketAuthUser | null> {
  const token =
    auth && typeof auth === 'object' && typeof (auth as { token?: unknown }).token === 'string'
      ? (auth as { token: string }).token
      : null;
  if (!token) return null;
  try {
    const payload = await jwt.verifyAsync<JwtPayload>(token, {
      secret: config.get<string>('JWT_ACCESS_SECRET'),
    });
    return { id: payload.sub, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
