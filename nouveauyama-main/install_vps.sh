#!/bin/bash

# ============================================================
# GROUPE YAMA+ - Installation automatique sur VPS Hostinger
# Exécutez ce script sur votre VPS Ubuntu/Debian
# ============================================================

set -e

echo "========================================"
echo "  GROUPE YAMA+ - Installation VPS"
echo "========================================"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - MODIFIEZ CES VALEURS
DOMAIN="groupeyamaplus.com"
EMAIL="amadoubourydiouf@gmail.com"

echo -e "${BLUE}Étape 1/6: Mise à jour du système...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${BLUE}Étape 2/6: Installation de Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

echo -e "${BLUE}Étape 3/6: Installation de Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo apt install docker-compose -y
fi

echo -e "${BLUE}Étape 4/6: Installation de Nginx et Certbot...${NC}"
sudo apt install nginx certbot python3-certbot-nginx -y

echo -e "${BLUE}Étape 5/6: Configuration de Nginx...${NC}"

# Créer la configuration Nginx
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL sera configuré par Certbot
    
    # Taille max upload
    client_max_body_size 50M;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo -e "${BLUE}Étape 6/6: Configuration SSL avec Certbot...${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL || echo "SSL sera configuré manuellement"

echo ""
echo -e "${GREEN}========================================"
echo -e "  Installation terminée !"
echo -e "========================================${NC}"
echo ""
echo -e "Prochaines étapes:"
echo -e "1. Clonez votre code dans /var/www/$DOMAIN"
echo -e "2. Configurez les fichiers .env"
echo -e "3. Lancez: docker-compose up -d --build"
echo ""
