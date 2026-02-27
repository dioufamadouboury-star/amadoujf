# PRD - GROUPE YAMA+ E-Commerce

## Problem Statement
Site YAMA+ avec problèmes de login et d'affichage d'images. Suppression des dépendances Emergent et configuration pour déploiement sur Hostinger.

## Date
27 Février 2026

## Architecture
- **Frontend**: React.js avec Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT + Google OAuth direct

## User Personas
1. **Client**: Acheteur sénégalais cherchant électronique, électroménager, décoration, beauté
2. **Admin**: Gestionnaire de la boutique (gestion produits, commandes, emails)

## Core Requirements
- [x] Authentification email/password fonctionnelle
- [x] Google OAuth configuré (direct, sans Emergent)
- [x] Affichage des produits avec images
- [x] Suppression dépendances Emergent
- [x] Configuration pour Hostinger VPS

## What's Been Implemented (27 Feb 2026)
1. ✅ **Google OAuth Direct**: Remplacé Emergent Auth par Google OAuth direct
   - Nouvel endpoint `/api/auth/google/callback`
   - Configuration avec clés client fournies
   
2. ✅ **Correction URLs Images**: 
   - Remplacé toutes les URLs `emergentagent.com` par URLs locales/relatives
   - Corrigé index.html, manifest.json, server.py, email templates
   
3. ✅ **Suppression Dépendances Emergent**:
   - Supprimé scripts de génération d'images (emergentintegrations)
   - Supprimé posthog et scripts Emergent du HTML
   
4. ✅ **Configuration Hostinger**:
   - Guide de déploiement complet créé
   - Fichiers .env.example préparés
   - Script restore_database.py prêt

## Prioritized Backlog

### P0 (Critique) - Terminé
- [x] Login email/password
- [x] Google OAuth
- [x] Affichage produits

### P1 (Important) - À faire sur Hostinger
- [ ] Configuration SSL avec Let's Encrypt
- [ ] Configuration domaine dans Google Cloud Console
- [ ] Test complet post-déploiement

### P2 (Enhancement)
- [ ] Configuration MailerSend pour emails
- [ ] Configuration MailerLite pour marketing
- [ ] Configuration PayTech pour paiements mobiles
- [ ] Analytics (Google Analytics, Facebook Pixel)

## Next Tasks
1. Déployer sur Hostinger VPS en suivant le guide
2. Configurer le domaine DNS
3. Obtenir certificat SSL
4. Ajouter URI de redirection Google OAuth pour le domaine de production
5. Tester login Google sur production

## Credentials
- Admin: admin@yama.sn / Admin123!
- Google Client ID: 966683628684-al8bu5bd9bhp1ftrc0oat9fkua6smpfq.apps.googleusercontent.com
