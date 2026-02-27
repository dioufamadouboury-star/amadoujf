# GROUPE YAMA+ - Guide de déploiement rapide VPS

## Fichiers de déploiement inclus

```
├── docker-compose.yml      # Configuration Docker complète
├── .env.example            # Variables d'environnement (à copier vers .env)
├── deploy.sh              # Script de déploiement automatisé
├── nginx/
│   └── groupeyamaplus.com.conf  # Config Nginx pour le serveur
├── backend/
│   ├── Dockerfile         # Image Docker backend
│   └── .env.example       # Variables backend
└── frontend/
    ├── Dockerfile         # Image Docker frontend
    ├── nginx.conf         # Config Nginx interne
    └── .env.example       # Variables frontend
```

## Déploiement en 5 minutes

### 1. Connexion au VPS
```bash
ssh root@76.13.58.76
```

### 2. Installation des prérequis (si pas fait)
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install docker-compose nginx certbot python3-certbot-nginx git -y
```

### 3. Cloner le projet
```bash
cd /var/www
git clone https://github.com/VOTRE_USERNAME/groupeyamaplus.git
cd groupeyamaplus
```

### 4. Configurer l'environnement
```bash
# Copier le fichier exemple
cp .env.example .env

# Modifier les variables
nano .env
```

**Variables importantes à modifier dans .env :**
```env
MONGO_PASSWORD=VotreMotDePasseSecurise123!
JWT_SECRET=votre-secret-jwt-genere
PAYTECH_API_KEY=votre_cle_paytech
PAYTECH_API_SECRET=votre_secret_paytech
MAILERSEND_API_KEY=votre_cle_mailersend
```

### 5. Déployer
```bash
chmod +x deploy.sh
./deploy.sh deploy
```

### 6. Configurer Nginx et SSL
```bash
# Copier la config Nginx
cp nginx/groupeyamaplus.com.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/groupeyamaplus.com.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et recharger
nginx -t && systemctl reload nginx

# Installer SSL
certbot --nginx -d groupeyamaplus.com -d www.groupeyamaplus.com
```

### 7. Vérifier
```bash
./deploy.sh status
```

## Commandes utiles

```bash
# Voir les logs
./deploy.sh logs

# Redémarrer
./deploy.sh restart

# Mettre à jour (après git pull)
./deploy.sh update

# Arrêter
./deploy.sh stop
```

## Après déploiement - Corriger les images

1. Allez sur https://groupeyamaplus.com/admin
2. Connectez-vous en tant qu'admin
3. Cliquez sur le bouton orange **"Réparer les images"**

## Troubleshooting

### Frontend page blanche
```bash
# Vérifier les logs
docker-compose logs frontend

# Reconstruire
docker-compose up -d --build frontend
```

### Backend non accessible
```bash
# Vérifier les logs
docker-compose logs backend

# Vérifier la connexion MongoDB
docker-compose exec mongodb mongosh --eval "db.stats()"
```

### Problème SSL
```bash
# Renouveler le certificat
certbot renew --dry-run
```
