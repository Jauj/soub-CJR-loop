# Socialisme ou Barbarie - Blog Politique

Ce projet est un blog politique moderne construit avec React, Vite et Firebase.

## 🚀 Comment déployer sur votre propre serveur

Pour mettre ce site en ligne sur un hébergement classique (OVH, Gandi, Hostinger, etc.), suivez ces étapes simples :

### 1. Pré-requis
Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé sur votre ordinateur.

### 2. Préparation (Build)
Ouvrez un terminal dans ce dossier et exécutez les commandes suivantes :

```bash
# Installe les dépendances nécessaires
npm install

# Génère les fichiers optimisés pour le web
npm run build
```

### 3. Mise en ligne
Une fois la commande terminée, un dossier nommé **`dist`** apparaîtra à la racine du projet.
*   Connectez-vous à votre serveur via FTP (avec un logiciel comme FileZilla).
*   **Copiez tout le contenu du dossier `dist`** (pas le dossier lui-même, juste ce qu'il y a dedans) vers le dossier public de votre serveur (souvent nommé `www`, `public_html` ou `htdocs`).

### 4. C'est tout !
Votre site est maintenant en ligne. Il se connectera automatiquement à votre base de données Firebase pour récupérer les articles que vous avez écrits.

## 📝 Administration
Pour écrire ou modifier des articles, connectez-vous au site avec un compte Google autorisé (`ferrierjonas@gmail.com` ou `cjr.soub@gmail.com`). Un onglet "Admin" apparaîtra alors dans le menu.

---
© 2026 Socialisme ou Barbarie
