# CHANGELOG - Socialisme ou Barbarie Blog

Tous les changements importants de ce projet sont documentés dans ce fichier. Ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2026-06-07_v2] - 2026-06-07

### Titre
**Optimisation du mode lecture Firefox et styles d'impression**

### Raison
Correction du problème d'affichage en mode lecture Firefox sur la page Publications : articles supprimés réapparaissaient avec une structure HTML mal interprétée.

### ✅ Modifications

#### `index.html`
- ✅ Ajout des meta tags SEO manquants : `author`, `theme-color`, `og:site_name`, `twitter:creator`
- ✅ Amélioration de la structure des meta tags Open Graph et Twitter
- ✅ Intégration des styles `@media print` directement en `<head>` pour reconnaissance optimale
- ✅ Masquage de la navigation et UI en mode impression

#### `src/StylesGlobaux.css`
- ✅ Ajout de styles `@media print` complets :
  - Masquage des éléments de navigation (aside, nav, header, buttons)
  - Optimisation du contenu principal pour l'impression
  - Évitement des coupures de page en plein article
  - Formatage optimisé des images et textes
- ✅ Optimisations pour Firefox Reader View / Safari Reader :
  - Amélioration de la sémantique HTML avec balises structurées
  - Ligne-height optimisée (1.7) pour meilleure lisibilité
  - Structure DOM clarifiée pour extraction de contenu

### 🎯 Impact attendu
- ✅ Articles supprimés n'apparaissent plus en mode lecture Firefox
- ✅ Navigation et UI masquées en impression/mode lecteur
- ✅ Meilleure extraction du contenu principal
- ✅ Structure sémantique optimale (schema.org NewsArticle)
- ✅ Amélioration de l'accessibilité et de la lisibilité

### 📊 Fichiers modifiés
- `index.html` : 46 lignes (amélioré de +12 meta tags et styles print)
- `src/StylesGlobaux.css` : 188 lignes (augmenté de +132 lignes de styles print et optimisations)

### 🔗 Commits
- `ad3da888eb11b37f5a7223afec78cede72188ad8` - Styles CSS
- `324db96d915d77736edfb651dfa4b28cf8c9b259` - Meta tags et HTML

### ⏮️ Revert
Pour revenir à la version précédente : `git checkout main~1`

---

## [2026-06-07_v1] - 2026-06-07

### Titre
**Version initiale archivée**

### Description
État initial du projet avant les optimisations du mode lecture Firefox.

### 📊 État du projet
- Architecture React/Vite/Firebase
- Blog politique avec gestion administrative
- Structure modulaire et bien organisée
- Meta tags SEO de base configurés
- Styles globaux Tailwind intégrés

---

## Format de versioning

Chaque version suit le format : `YYYY-MM-DD_vN` où :
- `YYYY-MM-DD` = Date de la modification (année-mois-jour)
- `vN` = Numéro de version du jour (v1, v2, v3...)

**Exemple** : `2026-06-07_v2` signifie la 2ème version modifiée le 7 juin 2026.

---

## Comment utiliser ce CHANGELOG

1. **Pour voir les modifications d'une version** : Consultez la section correspondante
2. **Pour revenir à une version antérieure** : Voir le dossier `archives/versions/`
3. **Détails techniques** : Voir `VERSIONS_INDEX.md` pour l'index complet
