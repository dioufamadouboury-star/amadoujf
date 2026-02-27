# Guide de lancement en local - GROUPE YAMA+

## Configuration actuelle

Ce projet utilise :
- **React 19** avec **Create React App** + **CRACO**
- **date-fns ^3.6.0** (compatible avec react-day-picker 8.x)
- **yarn** comme gestionnaire de paquets (préféré)

## Prérequis

- **Node.js** : Version 18 ou 20
- **npm** : Version 8 ou supérieure

Vérifier les versions :
```powershell
node --version
npm --version
```

## Commandes de lancement

### Étape 1 : Se placer dans le dossier frontend

```powershell
cd frontend
```

### Étape 2 : Nettoyer les anciennes installations

```powershell
# Supprimer node_modules
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Supprimer les fichiers de lock
Remove-Item package-lock.json -ErrorAction SilentlyContinue
Remove-Item yarn.lock -ErrorAction SilentlyContinue
```

### Étape 3 : Installer les dépendances

```powershell
yarn install
```

Ou avec npm :
```powershell
npm install --legacy-peer-deps
```

> **Note** : Le flag `--legacy-peer-deps` est nécessaire avec npm car React 19 a des conflits de peer dependencies avec certains packages.

### Étape 4 : Lancer le serveur de développement

```powershell
npm start
```

### Étape 5 : Ouvrir le site

Une fois que vous voyez **"Compiled successfully"** dans la console, ouvrez :

**http://localhost:3000**

## Script automatique

Un script `OUVRIR_SITE.bat` est disponible à la racine du projet pour automatiser ces étapes.

## Résolution des erreurs courantes

### Erreur : "Unknown keyword formatMinimum"
**Cause** : Conflit entre ajv v6 et v8
**Solution** : Les `overrides` dans package.json corrigent ce problème. Refaire l'installation propre.

### Erreur : "Cannot find module 'ajv/dist/compile/codegen'"
**Cause** : Mauvaise version de ajv installée
**Solution** : Supprimer `node_modules` et réinstaller avec `--legacy-peer-deps`

### Erreur : "validate is not a function"
**Cause** : Incompatibilité entre terser-webpack-plugin et schema-utils
**Solution** : Les versions forcées dans package.json règlent ce problème.

### Erreur ERESOLVE avec date-fns
**Cause** : react-day-picker exige date-fns ^2 ou ^3, pas v4
**Solution** : date-fns est maintenant fixé à ^3.6.0 dans package.json

## Configuration du backend

Le frontend a besoin du backend pour fonctionner. Voir le fichier `README.md` à la racine pour les instructions de configuration du backend.

## Variables d'environnement

Créer un fichier `.env` dans le dossier `frontend` :

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Pour la production, remplacer par l'URL de votre serveur.
