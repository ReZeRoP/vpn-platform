import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplication } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

/**
 * Socket.IO adapter backed by Redis pub/sub for multi-instance fan-out.
 * Gracefully falls back to the in-memory adapter when Redis is unavailable
 * (single-server deployments work fine without Redis).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger('RedisIoAdapter');
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — using in-memory Socket.IO adapter (single-instance only)');
      return;
    }

    try {
      const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
      const subClient = pubClient.duplicate();

      await Promise.all([
        pubClient.connect(),
        subClient.connect(),
      ]);

      pubClient.on('error', (err) => this.logger.error(`Redis pub client error: ${err.message}`));
      subClient.on('error', (err) => this.logger.error(`Redis sub client error: ${err.message}`));

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Socket.IO Redis adapter connected');
    } catch (err) {
      this.logger.warn(
        `Failed to connect Redis adapter (${err instanceof Error ? err.message : 'unknown'}) — falling back to in-memory`,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
