# Index des versions archivées - Socialisme ou Barbarie

Cet index recense toutes les versions archivées du projet avec leurs snapshots complets.

## 📋 Versions archivées

| Version | Date | Titre | Statut | Dossier | Détails |
|---------|------|-------|--------|---------|---------|
| 2026-06-07_v2 | 2026-06-07 | Optimisation mode lecture Firefox | ✅ Déployée | `v2026-06-07_v2/` | Styles print, meta tags SEO, sémantique HTML |
| 2026-06-07_v1 | 2026-06-07 | Version initiale | ✅ Archivée | `v2026-06-07_v1/` | État initial du projet |

---

## 🗂️ Structure des archives

```
archives/versions/
├── v2026-06-07_v1/
│   ├── index.html (version initiale)
│   ├── src/
│   │   ├── StylesGlobaux.css (originale)
│   │   └── Application.tsx
│   ├── package.json
│   └── SNAPSHOT_INFO.md
├── v2026-06-07_v2/
│   ├── index.html (avec meta tags améliorés)
│   ├── src/
│   │   ├── StylesGlobaux.css (avec @media print)
│   │   └── Application.tsx
│   ├── package.json
│   └── SNAPSHOT_INFO.md
└── VERSIONS_INDEX.md (ce fichier)
```

---

## 📝 Notation des versions

Format : `YYYY-MM-DD_vN`

- **YYYY-MM-DD** : Date de la modification (année-mois-jour)
- **vN** : Numéro séquentiel des modifications du jour

**Exemple** :
- `2026-06-07_v1` = Première version du 7 juin 2026
- `2026-06-07_v2` = Deuxième version du 7 juin 2026
- `2026-06-08_v1` = Première version du 8 juin 2026

---

## 🔍 Recherche rapide

### Par date
- **7 juin 2026** : v1, v2

### Par type de modification
- **Styles & CSS** : v2026-06-07_v2
- **Structure & HTML** : v2026-06-07_v2
- **Base initiale** : v2026-06-07_v1

---

## 📚 Comment utiliser les archives

### Pour consulter une version archivée
1. Accédez au dossier `archives/versions/vXXXX-XX-XX_vN/`
2. Consultez le fichier `SNAPSHOT_INFO.md` pour les détails
3. Comparez les fichiers avec la version actuelle

### Pour revenir à une version antérieure
1. Consultez `CHANGELOG.md` pour les détails du changement
2. Récupérez les fichiers du dossier `archives/versions/vXXXX-XX-XX_vN/`
3. Appliquez manuellement ou créez une branche de revert : `git revert <commit-sha>`

### Pour créer une nouvelle version
1. Effectuez vos modifications et testez-les
2. Créez un snapshot dans `archives/versions/YYYY-MM-DD_vN/`
3. Mettez à jour ce fichier avec la nouvelle entrée
4. Documentez dans `CHANGELOG.md`

---

## 📌 Dernière mise à jour

**Dernière version** : 2026-06-07_v2
**Date** : 2026-06-07
**Auteur** : Copilot
**Statut** : Déployée sur https://cjr-soub.fr/
