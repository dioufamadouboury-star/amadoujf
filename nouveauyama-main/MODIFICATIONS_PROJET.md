# Document des modifications - GROUPE YAMA+

Ce document récapitule **tout ce qui a été supprimé** et **tout ce qui a été ajouté ou modifié** dans le cadre des corrections et améliorations sur ce projet.

---

## Partie 1 — Tout ce qui a été SUPPRIMÉ

### 1.1 Dépendances Emergent (Migration vers autonomie)

| Élément supprimé | Fichier | Raison |
|------------------|---------|--------|
| `emergentintegrations` | `backend/requirements.txt` | Dépendance propriétaire Emergent - remplacée par SDK OpenAI standard |
| Google Auth Emergent | `backend/server.py`, `frontend/src/contexts/AuthContext.js` | Service géré par Emergent - désactivé, nécessite reconfiguration manuelle |

### 1.2 Dans `frontend/package.json`

| Élément supprimé/modifié | Raison |
|--------------------------|--------|
| `"date-fns": "^4.1.0"` | Incompatible avec react-day-picker 8.x - downgrade vers ^3.6.0 |

### 1.3 Configurations à éviter

- **Ne pas** forcer **ajv v8** (ex. `"ajv": "8.12.0"`) → provoque « Unknown keyword formatMinimum »
- **Ne pas** laisser **date-fns en 4.x** si on garde react-day-picker 8 → provoque ERESOLVE
- **Ne pas** garder uniquement overrides ajv + ajv-keywords **sans** schema-utils et terser-webpack-plugin

---

## Partie 2 — Tout ce qui a été AJOUTÉ ou MODIFIÉ

### 2.1 Fichier : `frontend/package.json`

#### A. Modification de dépendances

| Champ | Avant | Après |
|-------|-------|-------|
| **date-fns** | `"date-fns": "^4.1.0"` | `"date-fns": "^3.6.0"` |

**Raison** : `react-day-picker@8.10.1` exige `date-fns` en `^2.28.0 || ^3.0.0`

#### B. Ajout des blocs `overrides` et `resolutions`

```json
"overrides": {
  "ajv": "6.12.6",
  "ajv-keywords": "3.5.2",
  "schema-utils": "2.7.1",
  "terser-webpack-plugin": "4.2.3"
},
"resolutions": {
  "ajv": "6.12.6",
  "ajv-keywords": "3.5.2",
  "schema-utils": "2.7.1",
  "terser-webpack-plugin": "4.2.3"
}
```

**Raisons** :
- **ajv 6.12.6** : CRA/CRACO utilise ajv 6
- **ajv-keywords 3.5.2** : Compatible uniquement avec ajv 6
- **schema-utils 2.7.1** : Cohérent avec ajv 6
- **terser-webpack-plugin 4.2.3** : Utilise schema-utils 2.x

### 2.2 Fichiers de documentation créés

| Fichier | Description |
|---------|-------------|
| `README.md` | Documentation complète du projet |
| `MIGRATION_GUIDE.md` | Guide de migration hors Emergent |
| `DEPLOYMENT.md` | Instructions de déploiement VPS |
| `frontend/LANCER_EN_LOCAL.md` | Instructions de lancement local |
| `OUVRIR_SITE.bat` | Script Windows de lancement automatique |
| `MODIFICATIONS_PROJET.md` | Ce document |
| `backend/.env.example` | Variables d'environnement backend |
| `frontend/.env.example` | Variables d'environnement frontend |

### 2.3 Localisation des assets

Toutes les images CDN Emergent ont été téléchargées et stockées localement :

```
frontend/public/assets/images/
├── logo_yama.png
├── category_electronique.png
├── category_electromenager.png
├── category_decoration.jpeg
├── category_beaute.jpeg
├── category_automobile.png
├── payment_wave.webp
├── payment_orange_money.png
└── [autres images]
```

### 2.4 Modifications du Backend

#### `backend/server.py`

| Modification | Détail |
|--------------|--------|
| Import OpenAI | `from openai import OpenAI` (SDK standard) |
| Suppression emergentintegrations | Analyse d'image via OpenAI directement |
| Désactivation Google Auth Emergent | Commenté, JWT standard fonctionne |
| Upload d'images | URLs absolues retournées pour affichage correct |

#### `backend/requirements.txt`

| Ajouté | Supprimé |
|--------|----------|
| `openai` | `emergentintegrations` |

### 2.5 Modifications du Frontend

#### `frontend/src/App.js`

```javascript
// ScrollToTop amélioré - support multi-navigateurs
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    }
  }, [pathname, hash]);

  return null;
}
```

#### `frontend/src/contexts/AuthContext.js`

- Suppression de la logique Google Auth Emergent
- Conservation de l'authentification JWT standard

### 2.6 Scripts et configuration Docker

| Fichier | Description |
|---------|-------------|
| `Dockerfile` | Image Docker pour déploiement |
| `docker-compose.yml` | Configuration multi-conteneurs |
| `backup_db.py` | Script de sauvegarde MongoDB |
| `database_backup.json` | Sauvegarde des données |

---

## Partie 3 — Problèmes connus et solutions

### 3.1 PayTech en mode test

**Symptôme** : Paiements traités pour 104 FCFA au lieu du montant réel

**Analyse** :
- Le code envoie correctement `env=prod`
- Le montant `item_price` est correct
- Les clés API sont configurées

**Conclusion** : Problème côté compte PayTech
- Le compte n'est pas entièrement activé pour la production
- **Action requise** : Contacter le support PayTech pour activer le compte en production

### 3.2 Liens internes qui scrollent vers le footer

**Symptôme** : Certains liens causeraient un scroll vers le footer

**Analyse** :
- Les liens utilisent correctement `<Link to="...">` de React Router
- Aucune ancre `#` dans les URLs
- Le composant ScrollToTop a été amélioré

**Solutions appliquées** :
- Amélioration de ScrollToTop avec `requestAnimationFrame`
- Vérification des hash dans l'URL avant scroll
- Reset des conteneurs overflow

---

## Partie 4 — Procédure d'installation

### Installation Frontend

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install --legacy-peer-deps
npm start
```

### Installation Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

---

## Partie 5 — Intégrations tierces

| Service | Statut | Notes |
|---------|--------|-------|
| PayTech | ⚠️ Test mode | Nécessite activation compte production |
| MailerSend | ✅ Actif | Emails transactionnels |
| MailerLite | ✅ Actif | Marketing automation |
| OpenAI | ✅ Actif | Analyse d'images |
| MongoDB | ✅ Actif | Base de données |
| pywebpush | ✅ Actif | Notifications push |
| reportlab | ✅ Actif | Génération PDF |

---

## Partie 6 — Variables d'environnement

### Backend (.env)

```env
MONGO_URL=mongodb://...
DB_NAME=lumina_senegal
JWT_SECRET=votre-secret-jwt
SITE_URL=https://votre-domaine.com
PAYTECH_API_KEY=votre-cle-api
PAYTECH_API_SECRET=votre-secret-api
PAYTECH_ENV=prod
MAILERSEND_API_KEY=votre-cle-mailersend
OPENAI_API_KEY=votre-cle-openai
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://votre-domaine.com
```

---

*Document généré le: Décembre 2025*
*Version: 1.0*
