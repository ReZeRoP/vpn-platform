# Deployment Guide

Two parts: **(A)** push this project to GitHub, **(B)** deploy it to a Linux server with one command.

---

## A. Push to a new GitHub repo

> **One-time cleanup first:** a partial `.git/` folder may exist in this project from the sandbox. Delete it before initializing, then start clean:
> ```bash
> rm -rf .git          # PowerShell: Remove-Item -Recurse -Force .git
> git init
> git add -A
> git commit -m "Initial scaffold: monorepo, Prisma schema, AMOLED/RTL design, Docker deploy"
> ```

Then push it. From your machine:

### Option 1 — GitHub CLI (easiest)
```bash
gh repo create vpn-platform --private --source=. --remote=origin --push
```

### Option 2 — plain git
1. Create an empty repo on github.com (no README/gitignore — this repo already has them).
2. Then:
```bash
git remote add origin https://github.com/<your-username>/<repo>.git
git branch -M main
git push -u origin main
```

> The `.gitignore` already excludes `node_modules/`, `.env`, build output, and uploads — no secrets get pushed.

---

## B. One-command server install

On a fresh **Ubuntu/Debian** server (2 vCPU / 2GB RAM is plenty to start):

```bash
git clone https://github.com/<your-username>/<repo>.git vpn-platform
cd vpn-platform
sudo bash install.sh
```

The installer will:
1. Install Docker + Compose if missing.
2. Generate a `.env` with strong random secrets (JWT + DB password) — asks only for your public URL.
3. Build and launch the full stack: **Postgres, Redis, API (NestJS), Web (Next.js), Nginx**.
4. Apply database migrations.

When it finishes, your site is live on port 80.

### Everyday commands
```bash
docker compose ps          # service status
docker compose logs -f     # live logs
docker compose restart api # restart one service
docker compose down        # stop everything
docker compose up -d        # start again
```

---

## C. Putting it behind Cloudflare (recommended)
1. Point your domain's A record at the server IP.
2. In Cloudflare: enable proxy (orange cloud), set SSL/TLS mode to **Full**.
3. Nginx already forwards `X-Forwarded-Proto`/`X-Forwarded-For` and upgrades WebSocket for the chat, so Socket.IO works through the proxy.
4. Set your `.env` `WEB_URL` to the `https://` domain and `docker compose up -d` to apply.

> For TLS directly on the box instead of Cloudflare, add Certbot or Caddy in front — ask and I'll wire it in.

---

## D. Media uploads (receipts + chat images)
Fill the `S3_*` values in `.env` with your Cloudflare R2 (or any S3-compatible) credentials, then restart the API. Until then, uploads are disabled but the rest of the app runs fine.

## E. Telegram notifications (optional, deferred)
Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID` in `.env` when we build that module.
