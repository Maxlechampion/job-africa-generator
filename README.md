# Job Africa — Générateur modulaire

Système de génération **modulaire** et **asynchrone** du projet Job Africa.

Chaque module peut être installé, testé, modifié ou supprimé **indépendamment** sans impacter les autres.

---

## 🎯 Avantages

- ✅ **Isolation** : un module cassé n'affecte pas les autres
- ✅ **Rollback** : revenir à une version précédente d'un seul module
- ✅ **Parallélisation** : plusieurs développeurs sur des modules différents
- ✅ **Testabilité** : tester chaque module isolément
- ✅ **Traçabilité** : état des modules dans `_state/installed.json`
- ✅ **Backup automatique** : fichiers sauvegardés avant écrasement

---

## 📋 Modules disponibles

| ID | Nom | Description |
|---|---|---|
| 00 | Architecture | Crée l'arborescence complète |
| 01 | Backend Base | FastAPI + Supabase |
| 02 | Collecteurs | RSS + Scraping HTML |
| 03 | Scheduler | APScheduler |
| 04 | Déduplication | Dédup + catégorisation |
| 05 | IA Hugging Face | Résumé, skills, matching |
| 06 | Base enrichie | 15+ tables |
| 07 | Frontend Vue | Vue 3 + Vite |
| 08 | Dashboard Admin | Chart.js + KPIs |
| 09 | CI/CD | GitHub Actions + Render + Vercel |
| 10 | PWA | Installable Android + iOS |
| 11 | Auth Supabase | Login + rôles |
| 12 | Multi-langue | FR / EN |
| 13 | Partage social | WhatsApp, LinkedIn |
| 14 | Monétisation | Mobile Money + cartes |
| 15 | Push | Web Push API |

---

## 🚀 Installation

```bash
# 1. Installer les dépendances du générateur
npm install

# 2. Créer l'architecture (obligatoire)
node 00-architecture.js

# 3. Installer les modules dans l'ordre
node 01-backend-base.js
node 02-collectors.js
node 03-scheduler.js
# ...

# OU tout installer d'un coup
node run.js --all
```

---

## 🎛️ Commandes

```bash
# Voir l'état des modules
node run.js --status

# Lister les modules
node run.js --list

# Installer un module spécifique
node 01-backend-base.js

# Installer plusieurs modules
node run.js --only 01,02,03

# Installer tous les modules
node run.js --all

# Réinstaller un module (écrase)
node 01-backend-base.js --force

# Ignorer les fichiers existants
node 01-backend-base.js --skip-existing

# Simuler sans écrire
node 01-backend-base.js --dry-run

# Désinstaller un module
node 01-backend-base.js --uninstall

# Ou via le runner
node run.js --uninstall 01
```

---

## 📁 Structure

```
job-africa-generator/
├── 00-architecture.js
├── 01-backend-base.js
├── 02-collectors.js
├── ...
├── 15-push-notifications.js
│
├── _lib/
│   ├── fs-utils.js
│   ├── logger.js
│   ├── registry.js
│   └── validator.js
│
├── _config/
│   └── project.json
│
├── _state/
│   └── installed.json       ← Généré automatiquement
│
├── _backups/                ← Backups horodatés
│   └── 2026-09-16T12-30-45/
│
├── run.js
├── package.json
└── README.md
```

---

## 🔄 Rollback

Si un module casse quelque chose :

```bash
# 1. Voir les backups
ls _backups/

# 2. Restaurer une version antérieure
cp _backups/2026-09-16T12-30-45/backend/app/main.py backend/app/main.py

# 3. Ou désinstaller puis réinstaller
node 01-backend-base.js --uninstall
node 01-backend-base.js
```

---

## 📊 État des modules

Le fichier `_state/installed.json` contient :

```json
{
  "modules": {
    "00": {
      "installedAt": "2026-09-16T10:00:00.000Z",
      "version": "1.0.0",
      "directories": 30,
      "files": 5
    },
    "01": {
      "installedAt": "2026-09-16T10:05:00.000Z",
      "version": "1.0.0",
      "files": ["backend/requirements.txt", "..."],
      "stats": { "created": 12, "overwritten": 0, "skipped": 0 }
    }
  }
}
```

---

## 🎯 Bonnes pratiques

1. **Toujours installer 00 en premier** (architecture)
2. **Respecter l'ordre** des modules (01 → 15)
3. **Tester chaque module** avant de passer au suivant
4. **Commiter après chaque module** installé
5. **Utiliser `--dry-run`** avant les gros changements
6. **Sauvegarder `_state/installed.json`** dans git

---

## ➕ Créer un nouveau module

1. Copier `01-backend-base.js` comme template
2. Renommer en `XX-nouveau-module.js`
3. Modifier :
   - Les prérequis
   - Les fichiers à créer
   - Les messages
4. Ajouter dans `run.js` (tableau `MODULES`)
5. Tester avec `--dry-run`

---

## 🐛 Dépannage

**Module échoue avec "prérequis manquants"**
→ Installer d'abord les modules requis (00, et parfois 01)

**Fichiers déjà existants**
→ Utiliser `--force` pour écraser ou `--skip-existing` pour ignorer

**Rollback nécessaire**
→ Consulter `_backups/` (horodaté automatiquement)

**État corrompu**
→ Supprimer `_state/installed.json` puis réinstaller