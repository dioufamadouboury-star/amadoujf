# CORRECTION DES IMAGES EN PRODUCTION

## ÉTAPES À SUIVRE APRÈS DÉPLOIEMENT

### Étape 1 : Déployez le code
Cliquez sur "Deploy" dans Emergent pour déployer les corrections.

### Étape 2 : Connectez-vous à votre admin
Allez sur https://groupeyamaplus.com/login et connectez-vous avec votre compte admin.

### Étape 3 : Récupérez votre token
Ouvrez la console du navigateur (F12 → Console) et tapez :
```javascript
localStorage.getItem('token')
```
Copiez le token affiché (sans les guillemets).

### Étape 4 : Exécutez la correction
Ouvrez un nouvel onglet et allez sur cette URL (remplacez VOTRE_TOKEN) :

**Pour vérifier les images :**
```
https://groupeyamaplus.com/api/admin/check-images
```
(Ajoutez le header Authorization: Bearer VOTRE_TOKEN)

**Pour corriger automatiquement :**
Utilisez cette commande curl depuis votre terminal ou utilisez un outil comme Postman :

```bash
curl -X POST "https://groupeyamaplus.com/api/admin/fix-image-urls" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json"
```

### Étape 5 : Vérifiez le résultat
Le retour vous indiquera combien de produits ont été corrigés.
Rafraîchissez votre site pour voir les images.

---

## ALTERNATIVE PLUS SIMPLE

Si vous avez du mal avec les commandes, vous pouvez aussi :

1. Aller dans votre dashboard admin
2. Ouvrir la console du navigateur (F12)
3. Coller ce code :

```javascript
const token = localStorage.getItem('token');
fetch('/api/admin/fix-image-urls', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Résultat:', data);
  alert('Correction terminée: ' + data.products_fixed + ' produits corrigés');
});
```

4. Appuyez sur Entrée
5. Une alerte vous indiquera combien de produits ont été corrigés

---

## CE QUE FAIT LA CORRECTION

- Convertit les URLs absolues (https://groupeyamaplus.com/api/uploads/...) en URLs relatives (/api/uploads/...)
- Supprime les URLs vides
- Corrige les URLs de preview qui auraient été stockées par erreur

Après cette correction, vos images devraient s'afficher correctement.
