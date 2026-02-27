# Guide de Déploiement GROUPE YAMA+ sur Hostinger VPS

## Prérequis
- VPS Hostinger avec Ubuntu 20.04+ ou Debian 10+
- Accès SSH root
- Domaine configuré pointant vers l'IP du VPS

---

## ÉTAPE 1 : Connexion et préparation du serveur

```bash
# Connexion SSH à votre VPS
ssh root@VOTRE_IP_VPS

# Mise à jour du système
apt update && apt upgrade -y

# Installation des dépendances
apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git curl unzip
```

---

## ÉTAPE 2 : Installation de MongoDB

```bash
# Importer la clé GPG MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le repository (pour Ubuntu 22.04)
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer MongoDB
apt update && apt install -y mongodb-org

# Démarrer MongoDB
systemctl start mongod
systemctl enable mongod

# Vérifier que MongoDB fonctionne
mongosh --eval "db.version()"
```

---

## ÉTAPE 3 : Déploiement des fichiers

```bash
# Créer le dossier de l'application
mkdir -p /var/www/yamaplus
cd /var/www/yamaplus

# OPTION 1: Télécharger depuis votre machine locale
# Sur votre PC: scp -r backend/ frontend/ root@VOTRE_IP_VPS:/var/www/yamaplus/

# OPTION 2: Si vous avez un ZIP
# Uploadez le ZIP sur le serveur puis:
# unzip votre-fichier.zip -d /var/www/yamaplus/
```

---

## ÉTAPE 4 : Configuration du Backend

```bash
# Créer l'environnement virtuel Python
cd /var/www/yamaplus
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
cd backend
pip install -r requirements.txt

# Créer le fichier .env avec VOS clés
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=groupeyamaplus
CORS_ORIGINS=*
JWT_SECRET=yama-plus-production-secret-2025-change-me-unique

# Google OAuth
GOOGLE_CLIENT_ID=966683628684-al8bu5bd9bhp1ftrc0oat9fkua6smpfq.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Site URL (REMPLACEZ par votre domaine)
SITE_URL=https://VOTRE-DOMAINE.com
FRONTEND_URL=https://VOTRE-DOMAINE.com

# MailerSend
MAILERSEND_API_KEY=mlsn.6e57f054d9fdd43a883856b8d393972ec91b8b2d72ff93c4a979db2fdb6bbac1
MAILERSEND_FROM_EMAIL=noreply@VOTRE-DOMAINE.com
MAILERSEND_FROM_NAME=GROUPE YAMA+

# PayTech
PAYTECH_API_KEY=7e8d68da0374be6ae83f99456ea04878c3eeef0941d2595acd892b871e3e90e4
PAYTECH_SECRET_KEY=9cd7412a542136cd3c8f6168e640bca37b14bb871483002e05f0c5cd3a48d1a6
PAYTECH_ENV=prod

# OpenAI
OPENAI_API_KEY=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
EOF
```

---

## ÉTAPE 5 : Service systemd pour le Backend

```bash
# Créer le service
cat > /etc/systemd/system/yamaplus-backend.service << 'EOF'
[Unit]
Description=YAMA+ Backend API
After=network.target mongod.service

[Service]
User=root
WorkingDirectory=/var/www/yamaplus/backend
Environment="PATH=/var/www/yamaplus/venv/bin"
ExecStart=/var/www/yamaplus/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Activer et démarrer
systemctl daemon-reload
systemctl start yamaplus-backend
systemctl enable yamaplus-backend

# Vérifier
systemctl status yamaplus-backend
```

---

## ÉTAPE 6 : Configuration du Frontend

```bash
# Installer yarn
npm install -g yarn

cd /var/www/yamaplus/frontend

# Créer .env pour la production (REMPLACEZ VOTRE-DOMAINE.com)
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://VOTRE-DOMAINE.com
REACT_APP_GOOGLE_CLIENT_ID=966683628684-al8bu5bd9bhp1ftrc0oat9fkua6smpfq.apps.googleusercontent.com
EOF

# Installer et builder
yarn install
yarn build
```

---

## ÉTAPE 7 : Configuration Nginx

```bash
# Créer la configuration (REMPLACEZ votre-domaine.com)
cat > /etc/nginx/sites-available/yamaplus << 'EOF'
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    
    # Frontend
    location / {
        root /var/www/yamaplus/frontend/build;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|webp)$ {
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
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }
    
    # Uploads
    location /uploads/ {
        alias /var/www/yamaplus/backend/uploads/;
        expires 1y;
    }
    
    client_max_body_size 50M;
}
EOF

# Activer le site
ln -sf /etc/nginx/sites-available/yamaplus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et recharger
nginx -t && systemctl reload nginx
```

---

## ÉTAPE 8 : SSL avec Let's Encrypt

```bash
# Obtenir le certificat SSL (REMPLACEZ votre-domaine.com)
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Suivez les instructions (entrez votre email, acceptez les termes)
```

---

## ÉTAPE 9 : Configuration Google OAuth

**IMPORTANT** - Allez sur https://console.cloud.google.com :

1. **APIs & Services** > **Credentials**
2. Cliquez sur votre **OAuth 2.0 Client ID**
3. Dans **Authorized redirect URIs**, ajoutez :
   ```
   https://votre-domaine.com/auth/callback
   ```
4. Dans **Authorized JavaScript origins**, ajoutez :
   ```
   https://votre-domaine.com
   ```
5. **Enregistrez**

---

## ÉTAPE 10 : Vérification finale

```bash
# Vérifier le backend
curl http://localhost:8001/api/products

# Vérifier via le domaine
curl https://votre-domaine.com/api/products

# Voir les logs du backend
journalctl -u yamaplus-backend -f
```

---

## Commandes utiles

```bash
# Redémarrer le backend
systemctl restart yamaplus-backend

# Voir les logs
journalctl -u yamaplus-backend -n 100

# Redémarrer Nginx
systemctl restart nginx

# Rebuild frontend après modifications
cd /var/www/yamaplus/frontend && yarn build && systemctl reload nginx

# Vérifier MongoDB
systemctl status mongod
```

---

## Informations de connexion

| Info | Valeur |
|------|--------|
| **Admin Email** | admin@yamaplus.com |
| **Admin Password** | Admin123! |

---

## En cas de problème

```bash
# Logs backend
journalctl -u yamaplus-backend -n 50

# Logs Nginx
tail -50 /var/log/nginx/error.log

# Logs MongoDB
tail -50 /var/log/mongodb/mongod.log

# Tester si le port 8001 est actif
netstat -tlnp | grep 8001
```
