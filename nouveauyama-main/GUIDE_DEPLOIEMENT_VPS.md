# Guide de Déploiement VPS - GROUPE YAMA+

## Prérequis

### Serveur VPS
- Ubuntu 22.04+ ou Debian 11+
- Minimum 2GB RAM, 2 CPU cores
- 20GB d'espace disque

### Logiciels requis
- Docker et Docker Compose
- Nginx (pour reverse proxy)
- Certbot (pour SSL)

---

## Étape 1: Préparation du serveur

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installation de Docker Compose
sudo apt install docker-compose -y

# Installation de Nginx
sudo apt install nginx certbot python3-certbot-nginx -y
```

---

## Étape 2: Configuration des fichiers d'environnement

### Backend (.env)

Créez le fichier `backend/.env` :

```env
# MongoDB - Remplacez par vos credentials
MONGO_URL=mongodb://votre_user:votre_password@localhost:27017/lumina_senegal?authSource=admin
DB_NAME=lumina_senegal

# JWT Secret - Générez un secret unique
JWT_SECRET=votre-secret-jwt-unique-et-long

# Site URL - Votre domaine
SITE_URL=https://groupeyamaplus.com

# PayTech - Vos clés de production
PAYTECH_API_KEY=votre_cle_api_paytech
PAYTECH_API_SECRET=votre_secret_api_paytech
PAYTECH_ENV=prod

# MailerSend - Pour les emails
MAILERSEND_API_KEY=votre_cle_mailersend
MAILERSEND_FROM_EMAIL=noreply@groupeyamaplus.com
MAILERSEND_FROM_NAME=GROUPE YAMA+

# OpenAI - Pour l'analyse d'images (optionnel)
OPENAI_API_KEY=votre_cle_openai

# Web Push Notifications (optionnel)
VAPID_PRIVATE_KEY=votre_cle_privee_vapid
VAPID_PUBLIC_KEY=votre_cle_publique_vapid
```

### Frontend (.env)

Créez le fichier `frontend/.env` :

```env
REACT_APP_BACKEND_URL=https://groupeyamaplus.com
```

---

## Étape 3: Docker Compose

Utilisez ce `docker-compose.yml` :

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: yama_mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: votre_password_mongodb
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: yama_backend
    restart: unless-stopped
    depends_on:
      - mongodb
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/uploads:/app/uploads
    ports:
      - "8001:8001"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: yama_frontend
    restart: unless-stopped
    env_file:
      - ./frontend/.env
    ports:
      - "3000:3000"

volumes:
  mongodb_data:
```

---

## Étape 4: Configuration Nginx

Créez le fichier `/etc/nginx/sites-available/groupeyamaplus.com` :

```nginx
server {
    listen 80;
    server_name groupeyamaplus.com www.groupeyamaplus.com;

    # Redirection HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name groupeyamaplus.com www.groupeyamaplus.com;

    # SSL sera configuré par Certbot
    # ssl_certificate /etc/letsencrypt/live/groupeyamaplus.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/groupeyamaplus.com/privkey.pem;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Augmenter les limites pour les uploads
        client_max_body_size 50M;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activez le site :

```bash
sudo ln -s /etc/nginx/sites-available/groupeyamaplus.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Étape 5: SSL avec Certbot

```bash
sudo certbot --nginx -d groupeyamaplus.com -d www.groupeyamaplus.com
```

---

## Étape 6: Démarrage

```bash
# Dans le dossier du projet
docker-compose up -d --build

# Vérifier les logs
docker-compose logs -f
```

---

## Étape 7: Restaurer la base de données

```bash
# Copier le backup sur le serveur
scp database_backup.json user@votre_serveur:/chemin/projet/backend/

# Restaurer
docker exec -i yama_mongodb mongoimport --uri "mongodb://admin:password@localhost:27017/lumina_senegal?authSource=admin" --collection products --file /app/database_backup.json --jsonArray
```

---

## Étape 8: Corriger les images (IMPORTANT)

Après le déploiement :

1. Connectez-vous à `https://groupeyamaplus.com/admin`
2. Cliquez sur le bouton orange **"Réparer les images"**
3. Attendez le message de confirmation

---

## Commandes utiles

```bash
# Voir les logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Redémarrer un service
docker-compose restart backend

# Arrêter tout
docker-compose down

# Reconstruire après modification
docker-compose up -d --build
```

---

## Checklist de vérification

- [ ] MongoDB accessible
- [ ] Backend répond sur /api/health
- [ ] Frontend charge correctement
- [ ] SSL fonctionne (https)
- [ ] Connexion admin fonctionne
- [ ] Images s'affichent
- [ ] Paiements PayTech en mode production
- [ ] Emails fonctionnent

---

## Support

En cas de problème :
1. Vérifiez les logs : `docker-compose logs -f`
2. Vérifiez Nginx : `sudo nginx -t`
3. Vérifiez les certificats SSL : `sudo certbot certificates`
