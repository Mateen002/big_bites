#!/usr/bin/env bash
# ==============================================================================
# BigBites — Production VPS Bootstrap Script (Ubuntu 22.04 / 24.04 LTS)
# ==============================================================================

set -e

echo "🚀 Starting BigBites Production Server Provisioning..."

# 1. Update system packages
echo "📦 Updating APT packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git build-essential ufw nginx redis-server

# 2. Start and enable Redis
echo "⚡ Starting Redis Server..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 3. Install Node.js 20 LTS (NodeSource)
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Install PNPM & PM2 globally
echo "📦 Installing pnpm and pm2 globally..."
sudo npm install -g pnpm pm2

# 5. Configure Firewall (UFW)
echo "🛡️ Configuring Firewall..."
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Web Storefront (direct access)
sudo ufw allow 3001/tcp    # Admin Board (direct access)
sudo ufw allow 4000/tcp    # API Backend (direct access)
sudo ufw --force enable

# 6. Setup PM2 Startup on Boot
echo "🔄 Configuring PM2 to auto-start on system reboot..."
pm2 startup systemd -u $USER --hp $HOME || true

echo "=============================================================================="
echo "✅ VPS Server Environment is Ready!"
echo "=============================================================================="
echo "Next Steps:"
echo "1. Clone your repo or copy files to /var/www/bigbites (or ~/bigbites)"
echo "2. Copy .env files (with your Supabase DATABASE_URL and secrets)"
echo "3. Run: pnpm install"
echo "4. Run: pnpm run build"
echo "5. Run: pm2 start ecosystem.config.js"
echo "6. Run: pm2 save"
echo "=============================================================================="

