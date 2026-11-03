
# BigBites - VPS Deployment & Production Launch Guide

> This guide walks you through deploying BigBites on a fresh Linux VPS (Ubuntu 22.04 or 24.04 LTS), testing the live storefront and admin panel via your VPS IP address, and attaching your domain at the end.

---

## Architecture Overview

On your single $5/mo VPS server, PM2 runs three isolated background processes:
- **`bigbites-api`** (Port 4000): NestJS REST API + WebSocket
- **`bigbites-web`** (Port 3000): Customer Storefront (Next.js 15 SSR)
- **`bigbites-admin`** (Port 3001): Kitchen Operations Dashboard (Next.js 15 SPA)
- **Redis Server** (Port 6379): In-memory caching and cart sessions
- **Nginx**: Reverse proxy directing web traffic to the appropriate application

---

## Step 1: Order Your VPS ($5/mo)

### Recommended: Hetzner Cloud
1. Go to [Hetzner Cloud](https://www.hetzner.com/cloud) and sign up / log in.
2. Click **Add Server**:
   - **Location:** Choose **Singapore** (closest to Pakistan) or **Germany/Falkenstein**.
   - **Image (OS):** Choose **Ubuntu 24.04 LTS** (or 22.04 LTS).
   - **Type:** Standard $\rightarrow$ **CX22** (2 vCPU, 4 GB RAM, 40 GB NVMe SSD) ~ €4.50/mo (~$5 USD).
   - **SSH Keys:** Add your SSH key (or select "Password" if you prefer root password emailed to you).
3. Click **Create & Buy Now**.
4. In ~30 seconds, Hetzner will display your server's **IPv4 Address** (e.g., `195.201.55.10`).

*(Alternative: DigitalOcean $6/mo Droplet with Ubuntu 24.04).*

---

## Step 2: SSH into Your VPS

Open PowerShell or Terminal on your computer and connect to the server:

```bash
ssh root@YOUR_SERVER_IP
```
*(Enter your server password or SSH passphrase when prompted).*

---

## Step 3: Run the 1-Click Bootstrap Script

Once logged in as root on your VPS, run the following commands to install Node.js 20, PNPM, PM2, Redis, Nginx, and configure the firewall:

```bash
# 1. Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB_OR_REPO/BigBites/main/deploy/setup.sh -o setup.sh || true

# If deploying from your git repo directly:
mkdir -p /var/www/bigbites
cd /var/www/bigbites
git clone <YOUR_GIT_REPO_URL> .
chmod +x deploy/setup.sh
./deploy/setup.sh
```

---

## Step 4: Configure Production `.env`

Inside `/var/www/bigbites` on your VPS, create your production `.env`:

```bash
cp .env.production.example .env
nano .env
```

Fill in your actual values:
1. `DATABASE_URL`: Your Supabase connection string.
2. `JWT_SECRET`: A long random secret (e.g. run `openssl rand -base64 32`).
3. `ADMIN_EMAIL` & `ADMIN_PASSWORD`: Your login credentials for the Kitchen Board.
4. `NEXT_PUBLIC_WHATSAPP_SUPPORT`: Your kitchen phone number (e.g. `923001234567`).
5. `NEXT_PUBLIC_API_URL`: `http://YOUR_SERVER_IP:4000/api/v1` (temporarily using your IP before domain).
6. `CORS_ORIGINS`: `http://YOUR_SERVER_IP:3000,http://YOUR_SERVER_IP:3001`

Press `Ctrl + O` then `Enter` to save, and `Ctrl + X` to exit nano.

---

## Step 5: Install Dependencies & Build

```bash
cd /var/www/bigbites

# 1. Install all dependencies
pnpm install

# 2. Push database schema to Supabase (if not already done)
pnpm --filter @bigbites/api prisma:push

# 3. Build all workspace packages for production
pnpm run build
```

---

## Step 6: Start All Applications via PM2

```bash
# 1. Start API, Web, and Admin processes
pm2 start ecosystem.config.js

# 2. Save PM2 state so apps restart automatically if server reboots
pm2 save

# 3. Verify all processes are online
pm2 status
```

You will see:
```text
┌────┬──────────────────┬──────────┬──────┬───────────┬──────────┐
│ id │ name             │ mode     │ ↺    │ status    │ memory   │
├────┼──────────────────┼──────────┼──────┼───────────┼──────────┤
│ 0  │ bigbites-api     │ fork     │ 0    │ online    │ 85.4mb   │
│ 1  │ bigbites-web     │ fork     │ 0    │ online    │ 92.1mb   │
│ 2  │ bigbites-admin   │ fork     │ 0    │ online    │ 68.3mb   │
└────┴──────────────────┴──────────┴──────┴───────────┴──────────┘
```

---

## Step 7: Test Live in Your Browser (Using Server IP)

You can now open your browser on any phone or laptop:
- **Customer Storefront:** `http://YOUR_SERVER_IP:3000`
- **Kitchen Admin Board:** `http://YOUR_SERVER_IP:3001` (Log in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- **API Health Check:** `http://YOUR_SERVER_IP:4000/api/v1/health`

**Dry Run Test:**
1. Open `http://YOUR_SERVER_IP:3000`.
2. Add a burger or karahi to cart and place a Cash on Delivery order.
3. Open `http://YOUR_SERVER_IP:3001/orders` and confirm the order appeared on the kitchen board.

---

## Step 8: Attach Your Domain (When Ready)

Once you purchase your domain (e.g. `bigbites.store` or `bigbites.pk`):
1. In Cloudflare DNS (or registrar DNS), add these `A` records pointing to `YOUR_SERVER_IP`:
   - `@` $\rightarrow$ `YOUR_SERVER_IP`
   - `admin` $\rightarrow$ `YOUR_SERVER_IP`
   - `api` $\rightarrow$ `YOUR_SERVER_IP`
2. Enable Nginx proxy on the server:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/bigbites
   sudo ln -s /etc/nginx/sites-available/bigbites /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```
3. Update `.env`:
   - `NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api/v1"`
   - `CORS_ORIGINS="https://yourdomain.com,https://admin.yourdomain.com"`
4. Rebuild & reload PM2:
   ```bash
   pnpm run build
   pm2 restart all
   ```
5. You are live with full HTTPS/SSL on your custom domain!
