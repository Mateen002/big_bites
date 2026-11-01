#!/bin/bash
set -e

echo "=== Configuring BigBites Nginx Reverse Proxy & Certbot ==="

# 1. Update and install Nginx + Certbot
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 2. Copy Nginx configuration file
sudo cp /var/www/bigbites/deploy/nginx.conf /etc/nginx/sites-available/bigbites

# 3. Enable bigbites site and disable default placeholder
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/bigbites /etc/nginx/sites-enabled/bigbites

# 4. Test configuration syntax
sudo nginx -t

# 5. Restart and enable Nginx systemd service
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "=== Nginx Reverse Proxy is Active & Live! ==="
