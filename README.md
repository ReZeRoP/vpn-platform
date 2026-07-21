# فروشگاه کانفیگ + چت لحظه‌ای

Persian (RTL), AMOLED-dark platform: pre-generated VPN config store (warehouse model) + Telegram-like real-time chat.

## Stack
- **Web:** Next.js 14 (App Router), Tailwind (AMOLED palette), Vazirmatn, dayjs+jalaliday
- **API:** NestJS (REST + Socket.IO gateway), JWT auth
- **DB:** PostgreSQL + Prisma
- **Real-time:** Socket.IO + Redis adapter
- **Media:** Cloudflare R2 (S3-compatible) + Sharp compression

## Layout
```
apps/
  web/   → Next.js frontend (RTL + AMOLED design system)
  api/   → NestJS backend (REST + WebSocket)
packages/
  db/    → Prisma schema + client
  shared/→ shared types & socket event contracts
```

## Getting started
```bash
pnpm install
cp .env.example .env        # fill in DATABASE_URL, secrets, R2, etc.
pnpm db:generate
pnpm db:migrate
pnpm dev                    # runs web + api in parallel
```

> Requires Node 20+, pnpm 9, a Postgres instance, and Redis.

## Design constraints
- Persian-only UI, strict RTL, Jalali (Shamsi) dates everywhere.
- AMOLED dark theme only — no light mode. Pure-black canvas + glassmorphism.

## Fonts
Place `Vazirmatn[wght].woff2` in `apps/web/public/fonts/`.

## Status
Scaffold + schema + design system in place. Next: auth → store backend → chat engine.
