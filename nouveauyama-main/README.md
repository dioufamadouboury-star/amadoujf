# GROUPE YAMA+ - E-commerce Sénégal

Site e-commerce complet pour le marché sénégalais avec paiement PayTech, livraison locale, et administration complète.

## 🚀 Déploiement rapide sur VPS

### Prérequis
- VPS Ubuntu 22.04+
- Docker & Docker Compose
- Nginx
- Domaine configuré (DNS pointant vers votre IP)

### Installation en 5 minutes

```bash
# 1. Cloner le projet
git clone https://github.com/VOTRE_USERNAME/groupeyamaplus.git
cd groupeyamaplus

# 2. Configurer l'environnement
cp .env.example .env
nano .env  # Remplir vos clés

# 3. Déployer
chmod +x deploy.sh
./deploy.sh deploy

# 4. Configurer Nginx + SSL
cp nginx/groupeyamaplus.com.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/groupeyamaplus.com.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d groupeyamaplus.com -d www.groupeyamaplus.com
```

### Commandes utiles

```bash
./deploy.sh status   # État des services
./deploy.sh logs     # Voir les logs
./deploy.sh restart  # Redémarrer
./deploy.sh stop     # Arrêter
```

## 📋 Configuration requise

### Variables d'environnement (.env)

```env
# MongoDB
MONGO_USER=admin
MONGO_PASSWORD=VotreMotDePasse

# JWT (générer avec: openssl rand -hex 32)
JWT_SECRET=votre-secret-jwt

# Site
SITE_URL=https://groupeyamaplus.com

# PayTech (paiements)
PAYTECH_API_KEY=votre_cle
PAYTECH_API_SECRET=votre_secret
PAYTECH_ENV=prod

# MailerSend (emails)
MAILERSEND_API_KEY=votre_cle

# OpenAI (optionnel - analyse d'images)
OPENAI_API_KEY=votre_cle
```

## 🔧 Architecture

```
├── backend/           # API FastAPI
│   ├── server.py      # Application principale
│   ├── Dockerfile     
│   └── requirements.txt
├── frontend/          # React SPA
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf     # Config Nginx interne
├── docker-compose.yml # Orchestration
├── deploy.sh          # Script de déploiement
└── nginx/             # Config Nginx VPS
```

## 🛠 Fonctionnalités

- ✅ Catalogue produits avec catégories
- ✅ Panier et commandes
- ✅ Paiement PayTech (Wave, Orange Money, etc.)
- ✅ Authentification JWT
- ✅ Panel admin complet
- ✅ Gestion des livraisons par zone
- ✅ Emails transactionnels (MailerSend)
- ✅ Ventes flash
- ✅ Codes promo
- ✅ PWA (Progressive Web App)

## 📱 Admin

Accès admin : `/admin`
- Email: admin@yama.sn
- Password: admin123

**Après déploiement**, connectez-vous et cliquez sur "Réparer les images" pour corriger les URLs.

## 🐛 Troubleshooting

### Page blanche frontend
```bash
docker-compose logs frontend
docker-compose up -d --build frontend
```

### Backend non accessible
```bash
docker-compose logs backend
docker-compose exec mongodb mongosh --eval "db.stats()"
```

### Erreur "Not Found"
Vérifiez que Nginx est configuré pour proxy vers les bons ports (3000 pour frontend, 8001 pour backend).

## 📄 License

Propriétaire - GROUPE YAMA+
