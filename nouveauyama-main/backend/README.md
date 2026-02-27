# YAMA+ Backend Architecture

## Structure des dossiers

```
/app/backend/
├── server.py          # Point d'entrée principal FastAPI (à refactoriser)
├── requirements.txt   # Dépendances Python
├── .env               # Variables d'environnement
├── routes/            # Routes API (à implémenter progressivement)
├── services/          # Services métier
│   ├── __init__.py
│   └── email_service.py   # Service email (MailerSend + MailerLite)
├── models/            # Modèles Pydantic
│   └── __init__.py
└── tests/             # Tests unitaires et d'intégration
```

## Services disponibles

### Email Service (`services/email_service.py`)

Gère l'envoi d'emails via MailerSend (transactionnel) et MailerLite (marketing).

**Fonctions principales:**
- `send_email_async(to, subject, html, attachments)` - Envoie un email
- `get_email_template(content, title)` - Génère un template email HTML
- `mailerlite_service.add_subscriber(email, name, group_key)` - Ajoute un abonné MailerLite

**Configuration requise (.env):**
```
MAILERSEND_API_KEY=your_key
MAILERSEND_FROM_EMAIL=noreply@your-domain.com
MAILERLITE_API_KEY=your_key
ADMIN_NOTIFICATION_EMAIL=admin@email.com
SITE_URL=https://your-domain.com
```

## Plan de refactorisation

Le fichier `server.py` est actuellement monolithique (~7600 lignes). La refactorisation progressive prévoit:

1. ✅ Extraction du service email (`services/email_service.py`)
2. ⏳ Extraction des modèles Pydantic (`models/`)
3. ⏳ Création de routes séparées:
   - `routes/auth.py` - Authentification
   - `routes/products.py` - Gestion produits
   - `routes/orders.py` - Commandes
   - `routes/appointments.py` - Rendez-vous
   - `routes/admin.py` - Administration
   - `routes/payments.py` - Paiements

## API Endpoints principaux

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `PUT /api/auth/profile` - Mise à jour profil
- `POST /api/auth/forgot-password` - Demande réinitialisation
- `POST /api/auth/reset-password` - Réinitialisation mot de passe

### Produits
- `GET /api/products` - Liste produits
- `GET /api/products/{id}` - Détails produit
- `POST /api/admin/products` - Créer produit (admin)
- `PUT /api/admin/products/{id}` - Modifier produit (admin)

### Commandes
- `POST /api/orders` - Créer commande
- `GET /api/orders/{id}` - Détails commande
- `PUT /api/admin/orders/{id}/status` - Modifier statut (admin)

### Rendez-vous
- `POST /api/appointments` - Demande de RDV
- `GET /api/admin/appointments` - Liste RDV (admin)
- `GET /api/admin/appointments/stats` - Statistiques RDV
- `PUT /api/admin/appointments/{id}` - Modifier RDV (admin)

### Email Marketing
- `GET /api/admin/email/workflows` - Workflows email
- `GET /api/admin/mailerlite/groups` - Groupes MailerLite

## Tests

```bash
# Exécuter les tests
cd /app/backend
pytest tests/ -v

# Avec couverture
pytest tests/ --cov=. --cov-report=html
```

## Notifications Admin

Les emails de notification sont envoyés à `ADMIN_NOTIFICATION_EMAIL` pour:
- Nouvelles commandes
- Demandes de rendez-vous
- Paiements confirmés
