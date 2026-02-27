# Guide : Vérification de domaine avec Google Search Console

## Étape 1 : Accéder à Google Search Console

1. Allez sur [Google Search Console](https://search.google.com/search-console)
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Ajouter une propriété"** (bouton en haut à gauche)

## Étape 2 : Choisir le type de propriété

1. Sélectionnez **"Domaine"** (recommandé)
2. Entrez votre domaine : `groupeyamaplus.com` (sans https://)
3. Cliquez sur **"Continuer"**

## Étape 3 : Vérification DNS

Google vous donnera un **enregistrement TXT** à ajouter à votre DNS.

Exemple de ce que vous verrez :
```
Nom : @
Type : TXT
Valeur : google-site-verification=XXXXXXXXXXXXXXXXXXXX
```

## Étape 4 : Ajouter l'enregistrement chez Hostinger

1. Connectez-vous à votre compte **Hostinger**
2. Allez dans **"Domaines"** → **"groupeyamaplus.com"**
3. Cliquez sur **"Zone DNS"** ou **"DNS/Nameservers"**
4. Cliquez sur **"Ajouter un enregistrement"**
5. Remplissez :
   - **Type** : TXT
   - **Nom/Hôte** : `@` (ou laissez vide)
   - **Valeur/Target** : Collez la valeur fournie par Google (google-site-verification=...)
   - **TTL** : 3600 (ou valeur par défaut)
6. Cliquez sur **"Ajouter"** ou **"Enregistrer"**

## Étape 5 : Vérifier sur Google

1. Retournez sur Google Search Console
2. Cliquez sur **"Vérifier"**
3. La vérification peut prendre **quelques minutes à 48 heures**

## ⚠️ Erreurs courantes à éviter

1. **N'ajoutez pas http:// ou https://** dans la valeur
2. **Copiez la valeur EXACTE** fournie par Google (pas de modifications)
3. **Attendez 5-10 minutes** après avoir ajouté l'enregistrement avant de vérifier

## Après la vérification

Une fois vérifié, vous pourrez :
- Voir les performances de recherche de votre site
- Soumettre votre sitemap
- Recevoir des alertes sur les problèmes d'indexation
- Demander l'indexation de nouvelles pages

## Soumettre votre sitemap

1. Dans Search Console, cliquez sur **"Sitemaps"** dans le menu
2. Entrez l'URL de votre sitemap : `https://groupeyamaplus.com/sitemap.xml`
3. Cliquez sur **"Soumettre"**

---

*Si vous rencontrez des problèmes, partagez une capture d'écran de l'erreur.*
