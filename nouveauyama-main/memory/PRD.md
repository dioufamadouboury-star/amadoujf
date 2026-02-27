# GROUPE YAMA+ - Product Requirements Document

## Project Summary

**GROUPE YAMA+** est une plateforme marketplace e-commerce complète pour le Sénégal.

**URL Production** : https://groupeyamaplus.com
**URL Preview** : https://stable-prod.preview.emergentagent.com

## ✅ CORRECTIONS BUGS CRITIQUES (19 Février 2026)

### Tests Backend : 16/16 PASSÉS ✅
### Tests Frontend : 100% FONCTIONNEL ✅
### Bugs P0 : 3/3 CORRIGÉS ✅

| Bug | Status | Solution |
|-----|--------|----------|
| Images instables | ✅ CORRIGÉ | Fonction centralisée `getImageUrl()` dans utils.js |
| Gel création produit | ✅ CORRIGÉ | Réinitialisation formulaire améliorée |
| Page Coffret cassée | ✅ CORRIGÉ | État de chargement + valeurs par défaut |

| Fonctionnalité | Status | Détails |
|----------------|--------|---------|
| Authentification | ✅ | Login admin@yama.sn fonctionne |
| Session persistante | ✅ | Utilisateur reste connecté après refresh |
| Upload images | ✅ | URLs relatives, fonction getImageUrl centralise |
| Ventes Flash | ✅ | Bannière animée avec compte à rebours |
| Coffrets Cadeaux | ✅ | Page /coffret-cadeau complète |
| Panier | ✅ | Ajout, modification quantité |
| Checkout | ✅ | PayTech/Wave/Orange Money disponibles |
| Dashboard Admin | ✅ | Stats, produits, commandes |
| Blog | ✅ | 6 articles, catégories |
| SEO | ✅ | Meta tags, Open Graph, Structured Data |

## Current Status: ✅ PRÊT POUR DÉPLOIEMENT

### Session du 19 Février 2026 - Corrections 3 Bugs Critiques P0

#### Bug 1 : Images Produits Instables ✅ CORRIGÉ
- **Problème**: Les images apparaissaient/disparaissaient de façon aléatoire
- **Cause racine**: Gestion incohérente des URLs d'images entre upload (absolue) et affichage
- **Solution**: 
  - Création d'une fonction centralisée `getImageUrl()` dans `/app/frontend/src/lib/utils.js`
  - Stockage des URLs relatives dans la DB (ex: `/api/uploads/xxx.jpg`)
  - Conversion en URL absolue uniquement à l'affichage
  - Gestion des URLs d'autres domaines (extraction et reconstruction)
- **Fichiers modifiés**: 
  - `lib/utils.js` (nouvelle fonction getImageUrl)
  - `ProductCard.js`, `ProductPage.js`, `AdminPage.js`
  - `ProductFormModal.js`, `GiftBoxPage.js`
  - `FlashSalesSection.js`, `FrequentlyBoughtTogether.js`
  - `ProductComparison.js`, `AppointmentModal.js`
  - `FlashSalesAdminPage.js`, `SharedWishlistPage.js`
  - `GiftBoxAdmin.js`

#### Bug 2 : Gel après 2-3 Créations de Produits ✅ CORRIGÉ
- **Problème**: L'application gelait après création consécutive de produits
- **Cause racine**: État du formulaire non correctement réinitialisé (closure stale)
- **Solution**:
  - Refactorisation du useEffect dans `ProductFormModal.js`
  - Création d'un nouvel objet complet à chaque ouverture du modal
  - Ajout d'un délai dans `AdminPage.js` pour éviter les conditions de course
  - Reset des états `loading`, `uploadingImage`, `analyzingImage`
- **Fichiers modifiés**: `ProductFormModal.js`, `AdminPage.js`

#### Bug 3 : Page Coffret Cadeau Cassée ✅ CORRIGÉ
- **Problème**: Erreur `Cannot read properties of null (reading 'basePrice')`
- **Cause racine**: Accès aux propriétés avant que l'API ne réponde (state null)
- **Solution**:
  - Ajout d'un état `configLoading` pour le chargement initial
  - Écran de chargement pendant le fetch de la configuration
  - Opérateur `?.` (optional chaining) sur tous les accès à `selectedBoxSize` et `selectedWrapping`
  - Valeurs par défaut fallback dans les calculs
- **Fichiers modifiés**: `GiftBoxPage.js`

### Session du 18 Février 2026 - Corrections précédentes

#### Bugs corrigés :

1. **Images uploadées cassées** ✅ CORRIGÉ
   - Problème: Les URLs d'images pointaient vers un domaine incorrect
   - Solution: Le backend retourne maintenant des URLs relatives (`/api/uploads/filename.ext`) 
   - Le frontend convertit ces URLs en URLs absolues en utilisant `REACT_APP_BACKEND_URL`
   - Fichiers modifiés: `backend/server.py`, `AdminPage.js`, `ProductFormModal.js`, `ProviderDashboardPage.js`

2. **Déconnexion au rafraîchissement** ✅ CORRIGÉ
   - Problème: L'utilisateur était redirigé vers /login quand il rafraîchissait la page
   - Solution: Les pages protégées affichent un spinner pendant que `authLoading` est `true`
   - Fichiers modifiés: `AdminPage.js`, `ProviderDashboardPage.js`

## Architecture Technique

```
/app/
├── backend/
│   ├── server.py           # API FastAPI monolithique
│   ├── uploads/            # Dossier des images uploadées
│   ├── requirements.txt    # Dépendances Python
│   └── .env                # Configuration (Paytech, MailerSend, etc.)
└── frontend/
    ├── src/
    │   ├── contexts/
    │   │   ├── AuthContext.js    # Gestion auth avec loading state
    │   │   ├── CartContext.js    # Panier
    │   │   └── WishlistContext.js
    │   ├── pages/                 # Pages React
    │   └── components/            # Composants UI (dont ProductFormModal.js)
    └── package.json
```

## External Services

| Service | Status |
|---------|--------|
| MongoDB | ✅ Actif |
| Google OAuth (Emergent) | ✅ Actif |
| PayTech | ⚠️ Clés production ajoutées (à vérifier avec transaction réelle) |
| MailerSend | ✅ Actif |
| MailerLite | ✅ Actif |
| OpenAI/Emergent LLM | ✅ Actif |

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@yama.sn | admin123 |
| Provider | mamadou@provider.com | password123 |

## URLs

- **Preview** : https://stable-prod.preview.emergentagent.com
- **Production** : https://groupeyamaplus.com
- **API** : /api (prefix requis pour toutes les routes backend)

## Key Endpoints

- `POST /api/auth/login` - Connexion utilisateur
- `GET /api/auth/me` - Vérification session
- `POST /api/upload/image` - Upload d'image (retourne URL relative)
- `GET /api/uploads/{filename}` - Servir les images uploadées
- `GET /api/products` - Liste des produits
- `POST /api/products` - Créer un produit (admin)

## État des fonctionnalités demandées

| Fonctionnalité | Status |
|----------------|--------|
| Images uploadées cassées | ✅ Corrigé |
| Déconnexion au rafraîchissement | ✅ Corrigé |
| Logo mis à jour sur tout le site | ✅ Fait |
| Tagline "Votre partenaire au quotidien" | ✅ Ajouté sur login |
| Factures avec NINEA/RCCM | ✅ Fait (012808210 / SN DKR 2026 A 4814) |
| Factures avec 2 numéros de téléphone | ✅ Fait (78 382 75 75 / 77 849 81 37) |
| Descriptions IA améliorées | ✅ Prompt optimisé |
| PayTech clés production | ⚠️ À vérifier avec transaction réelle |
| Google Search Console | 📄 Guide créé (voir GOOGLE_SEARCH_CONSOLE_GUIDE.md) |

## Optimisations P2 (18 Février 2026)

| Fonctionnalité | Status |
|----------------|--------|
| Compression d'images automatique | ✅ Ajouté (Pillow, réduction ~25%) |
| Lazy loading images | ✅ Déjà présent (LazyImage.js) |
| Cache produits | ✅ Déjà présent (60s TTL) |
| Notifications push | ✅ Déjà présent |
| Système d'avis clients | ✅ Déjà présent |
| Suivi de commande | ✅ Déjà présent |

## Optimisations SEO P3 (18 Février 2026)

| Fonctionnalité | Status |
|----------------|--------|
| Meta tags dynamiques | ✅ Amélioré (SEO.js avec keywords, robots, etc.) |
| Open Graph images | ✅ Amélioré (product OG, Twitter cards) |
| Structured Data | ✅ Amélioré (Product, Article, Breadcrumb, Organization) |
| Blog SEO | ✅ Déjà présent (/blog avec catégories) |
| Sitemap | ✅ Déjà présent (/sitemap.xml) |

## Tâches futures

### P0 - À valider par l'utilisateur
- ⚠️ Vérifier les corrections sur le site LIVE (production peut avoir config différente)
- ⚠️ Tester PayTech avec une vraie transaction

### P1 - Haute priorité
- Guide utilisateur pour Google Search Console
- Vérifier PayTech avec une transaction réelle

### P2 - Moyenne priorité
- Système d'abonnement pour prestataires
- Système de notation et avis (amélioration)

### P3 - Refactoring
- Diviser server.py en routes séparées
- Nettoyage des fichiers dupliqués

## Nouvelles fonctionnalités ajoutées (19 Février 2026)

| Fonctionnalité | Status |
|----------------|--------|
| Bannière Ventes Flash animée | ✅ Ajoutée sur pages catégories |
| Coffrets Cadeaux Personnalisables | ✅ Nouvelle page /coffret-cadeau |
| Choix taille coffret | ✅ 4 tailles (3-12 articles) |
| Sélecteur d'articles | ✅ Modal avec recherche |
| Choix emballage | ✅ 5 options couleurs |
| Message personnalisé | ✅ Nom destinataire + message |
| Lien navigation | ✅ Ajouté dans Catégories |
| **Templates Coffrets Cadeaux** | ✅ **NOUVEAU** - 8 templates |

### Templates Coffrets Disponibles
| Template | Icône | Couleur | Description |
|----------|-------|---------|-------------|
| Ramadan | 🌙 | Vert | Coffrets pour le mois sacré |
| Enfant | 🧸 | Orange | Cadeaux pour les petits |
| Noël | 🎄 | Rouge | Magie de Noël |
| Pack Accessoires | 👜 | Violet | Accessoires tendances |
| Saint-Valentin | 💝 | Rose | Pour l'amour |
| Tabaski | 🐑 | Bleu | Aïd el-Kébir |
| Fête des Mères | 💐 | Rose | Pour les mamans |
| Classique | 🎁 | Violet | Par défaut |

---

*Dernière mise à jour: 19 Février 2026*
*Status: 3 Bugs P0 corrigés, validés en preview. En attente de validation utilisateur sur site LIVE*
