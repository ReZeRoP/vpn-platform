# Deployment Guide

Target: **Ubuntu 24.04** server with 2 vCPU / 2GB RAM minimum.

## One-command install

```bash
git clone https://github.com/ReZeRoP/vpn-platform.git
cd vpn-platform
sudo bash install.sh
```

The installer will:
1. Install Docker Engine + Compose plugin if missing.
2. Generate a `.env` with strong random secrets (Postgres password, JWT secret).
3. Ask for: public URL, admin username, admin password, optional Telegram bot token/chat ID.
4. Build and launch the full stack: Postgres, Redis, API (NestJS), Web (Next.js), Nginx.
5. Apply database migrations.
6. Start the application.

When it finishes, the site is live on port 80. The admin account is created automatically from the credentials you provided.

## Everyday commands

```bash
docker compose ps            # service status
docker compose logs -f api   # live API logs
docker compose logs -f web   # live web logs
docker compose restart api   # restart one service
docker compose down          # stop everything
docker compose up -d          # start again
```

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run automatically via the `migrate` one-shot service before the API starts.

## Backup

```bash
# Database
docker compose exec postgres pg_dump -U postgres vpnstore > backup.sql

# Restore
docker compose exec -T postgres psql -U postgres vpnstore < backup.sql
```

Uploaded files (receipts, chat images) are in the `uploads` Docker volume. If using S3/R2, they're stored externally.

## Behind Cloudflare (recommended)

1. Point your domain's A record at the server IP.
2. In Cloudflare: enable proxy (orange cloud), set SSL/TLS mode to **Full**.
3. Nginx forwards `X-Forwarded-Proto`/`X-Forwarded-For` and upgrades WebSocket for the chat.
4. Set `WEB_URL` to your `https://` domain in `.env` and run `docker compose up -d`.

## Media uploads (Cloudflare R2)

Fill the `S3_*` values in `.env` to use Cloudflare R2 for receipt and chat image storage. If left empty, uploads are stored on local disk in the `uploads` Docker volume and served by the API.

## Telegram bot (optional)

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID` in `.env` to receive instant Telegram notifications when a new card-to-card order is submitted. Create a bot via [@BotFather](https://t.me/BotFather), get your chat ID by messaging the bot and visiting `https://api.telegram.org/bot<TOKEN>/getUpdates`.

## Payment card configuration

After first login as admin, go to **Admin Panel → Settings** to configure your card number and cardholder name. These are stored in the database and displayed to users on the checkout page. No need to edit env vars or rebuild.

## Changing NEXT_PUBLIC_* values

`NEXT_PUBLIC_API_URL` is baked into the frontend at build time. If you change it in `.env`, you must rebuild:

```bash
docker compose build web
docker compose up -d web
```
