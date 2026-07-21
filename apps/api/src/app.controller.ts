import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Health check — useful behind Cloudflare / load balancers.
  @Get('health')
  health() {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
