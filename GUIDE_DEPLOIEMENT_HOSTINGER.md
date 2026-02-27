# Guide de Déploiement sur Hostinger VPS

## Prérequis
- VPS Hostinger avec Ubuntu 20.04+ ou Debian 10+
- Accès SSH root
- Domaine configuré pointant vers l'IP du VPS

## 1. Préparation du serveur

```bash
# Connexion SSH
ssh root@VOTRE_IP_VPS

# Mise à jour du système
apt update && apt upgrade -y

# Installation des dépendances
apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git curl

# Installation de MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl start mongod && systemctl enable mongod
```

## 2. Déploiement du Backend

```bash
# Créer le dossier de l'application
mkdir -p /var/www/yamaplus
cd /var/www/yamaplus

# Copier les fichiers (depuis votre machine locale)
# scp -r backend/ root@VOTRE_IP_VPS:/var/www/yamaplus/

# Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
cd backend
pip install -r requirements.txt

# Configurer les variables d'environnement
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=groupeyamaplus
CORS_ORIGINS=*
JWT_SECRET=votre-secret-jwt-securise-unique

# Google OAuth
GOOGLE_CLIENT_ID=966683628684-al8bu5bd9bhp1ftrc0oat9fkua6smpfq.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# OpenAI pour l'analyse d'images (optionnel)
OPENAI_API_KEY=votre-cle-openai-si-necessaire

# Site URL
SITE_URL=https://votre-domaine.com
EOF
```

## 3. Configurer systemd pour le Backend

```bash
cat > /etc/systemd/system/yamaplus-backend.service << 'EOF'
[Unit]
Description=YAMA+ Backend API
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/yamaplus/backend
Environment="PATH=/var/www/yamaplus/venv/bin"
ExecStart=/var/www/yamaplus/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl start yamaplus-backend
systemctl enable yamaplus-backend
```

## 4. Déploiement du Frontend

```bash
# Installer yarn
npm install -g yarn

# Copier et builder le frontend
cd /var/www/yamaplus/frontend

# Configurer .env pour la production
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://votre-domaine.com
REACT_APP_GOOGLE_CLIENT_ID=966683628684-al8bu5bd9bhp1ftrc0oat9fkua6smpfq.apps.googleusercontent.com
EOF

# Installer les dépendances et builder
yarn install
yarn build
```

## 5. Configuration Nginx

```bash
cat > /etc/nginx/sites-available/yamaplus << 'EOF'
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    
    # Frontend (React build)
    location / {
        root /var/www/yamaplus/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Uploads
    location /uploads/ {
        alias /var/www/yamaplus/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    client_max_body_size 20M;
}
EOF

# Activer le site
ln -sf /etc/nginx/sites-available/yamaplus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et recharger
nginx -t && systemctl reload nginx
```

## 6. SSL avec Let's Encrypt

```bash
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

## 7. Configuration Google OAuth (Important!)

Dans la console Google Cloud (https://console.cloud.google.com):
1. Allez dans "APIs & Services" > "Credentials"
2. Modifiez votre OAuth 2.0 Client ID
3. Ajoutez dans "Authorized redirect URIs":
   - `https://votre-domaine.com/auth/callback`
4. Ajoutez dans "Authorized JavaScript origins":
   - `https://votre-domaine.com`

## 8. Restauration de la base de données

```bash
cd /var/www/yamaplus/backend
source ../venv/bin/activate
python3 restore_database.py
```

## 9. Vérification

```bash
# Vérifier le backend
curl http://localhost:8001/api/products

# Vérifier le frontend
curl http://localhost:80

# Vérifier les logs
journalctl -u yamaplus-backend -f
```

## Commandes utiles

```bash
# Redémarrer le backend
systemctl restart yamaplus-backend

# Voir les logs
journalctl -u yamaplus-backend -n 100

# Rebuild le frontend après modifications
cd /var/www/yamaplus/frontend && yarn build && nginx -t && systemctl reload nginx
```

## Informations de connexion

- **Admin Email**: admin@yama.sn
- **Admin Password**: Admin123!

## Variables d'environnement à personnaliser

| Variable | Description |
|----------|-------------|
| JWT_SECRET | Clé secrète pour les tokens JWT (générez une chaîne unique) |
| OPENAI_API_KEY | Clé API OpenAI pour l'analyse d'images IA (optionnel) |
| SITE_URL | URL de votre site en production |
| MAILERSEND_API_KEY | Clé API MailerSend pour les emails (optionnel) |
| MAILERLITE_API_KEY | Clé API MailerLite pour le marketing (optionnel) |
