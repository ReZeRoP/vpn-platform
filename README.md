# فروشگاه کانفیگ + چت لحظه‌ای

Persian (RTL) AMOLED-dark platform for selling VPN configs via card-to-card payment with manual verification and atomic warehouse delivery, plus a Telegram-like real-time public chat.

## Features

- **Store**: Plans with stock indicators, card-to-card payment with receipt upload, wallet payment
- **Warehouse model**: Admin bulk-pastes subscription links; atomic `FOR UPDATE SKIP LOCKED` delivery on approval
- **Manual verification**: Admin reviews receipt screenshots, approves/rejects with notes
- **Auto-delivery**: On approval, one config is atomically grabbed from inventory and delivered to the buyer with QR code
- **Real-time chat**: Telegram-like public chat with Socket.IO — typing indicators, read receipts, image uploads, reply threads, message deletion, online presence
- **Support tickets**: Private conversations between users and admin
- **Wallet**: Balance ledger with admin adjustments
- **Notifications**: In-app notifications for order status changes
- **Admin panel**: Tabbed dashboard — stats, order review, plan/inventory management, user management, coupons, payment settings
- **Telegram bot**: Optional admin notification on new card-to-card orders
- **Jalali dates**: All dates in Shamsi calendar with Persian digits
- **AMOLED dark theme**: Pure-black canvas, glassmorphism, strict RTL

## Stack

- **Web**: Next.js 14 (App Router), Tailwind, Vazirmatn, zustand, socket.io-client, qrcode.react
- **API**: NestJS 10, Socket.IO + Redis adapter, JWT auth (opaque rotating refresh tokens)
- **DB**: PostgreSQL 16 + Prisma 5
- **Real-time**: Socket.IO + Redis adapter (graceful in-memory fallback)
- **Media**: Cloudflare R2 (S3-compatible) + Sharp compression, local-disk fallback
- **Deploy**: Docker Compose (Postgres, Redis, API, Web, Nginx)

## Project layout

```
apps/
  web/   → Next.js frontend (RTL + AMOLED design system)
  api/   → NestJS backend (REST + WebSocket)
packages/
  db/    → Prisma schema + client (built to dist/)
  shared/→ shared types & socket event contracts (built to dist/)
deploy/  → nginx.conf, Cloudflare real-IP list, proxy headers
```

## Quick start (production — Ubuntu 24.04)

```bash
git clone https://github.com/ReZeRoP/vpn-platform.git
cd vpn-platform
sudo bash install.sh
```

The installer installs Docker, generates secrets, asks for admin credentials, builds images, applies migrations, and starts the full stack. The site is live on port 80.

## Local development

Requires Node 20+, pnpm 9, PostgreSQL, and Redis running locally.

```bash
pnpm install
cp .env.example .env        # fill in DATABASE_URL, JWT_ACCESS_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
pnpm db:generate
pnpm db:migrate
pnpm dev                    # runs web + api in parallel
```

## Admin access

The first admin account is created automatically from `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars on API startup. After first login, change the password and configure payment card details in the admin panel → Settings tab.

## License

Private.
