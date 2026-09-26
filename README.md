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

## 📋 Modules disponibles (00 → 19)

| ID | Nom | Fichier | Description |
|---|---|---|---|
| 00 | Architecture | `00-architecture.js` | Arborescence complète |
| 01 | Backend Base | `01-backend-base.js` | FastAPI + Supabase |
| 02 | Collecteurs | `02-collectors.js` | RSS + Scraping |
| 03 | Scheduler | `03-scheduler.js` | APScheduler |
| 03.5 | ATS Collector | `04-ats-collector.js` | Greenhouse + Ashby |
| 04 | Scraper HTML | `04-scraper-html.js` | HTML + Playwright + PDF |
| 05 | API Collector | `05-api-collector.js` | ProGigFinder + Fuzu |
| 06 | Déduplication | `06-deduplication.js` | Dedup + catégorisation |
| 07 | Base enrichie | `07-database-enriched.js` | 15+ tables |
| 08 | IA Hugging Face | `08-ai-huggingface.js` | Résumé, skills, langue |
| 09 | Frontend Vue | `09-frontend-vue.js` | Vue 3 + Vite |
| 09b | CI/CD | `09b-cicd-deployment.js` | GitHub Actions |
| 10 | Dashboard Admin | `10-admin-dashboard.js` | Chart.js + KPIs |
| 10b | PWA | `10b-pwa.js` | Installable Android + iOS |
| 11 | Auth Supabase | `11-auth-supabase.js` | Login + rôles |
| 12 | Multi-langue | `12-i18n.js` | FR / EN |
| 13 | Partage social | `13-social-share.js` | WhatsApp, LinkedIn, QR |
| 14 | Monétisation | `14-monetization.js` | Mobile Money + cartes |
| 14b | Page Tarifs | `14b-pricing-page.js` | Page /pricing |
| 15 | Push | `15-push-notifications.js` | Web Push API |
| 15b | Boutons Booster | `15b-boost-buttons.js` | Bouton sur les offres |
| 15c | Fix use_admin | `15c-fix-use-admin.js` | Bypass RLS backend |
| 15d | Payment Toast | `15d-payment-toast.js` | Notification paiement |
| 16 | KKiaPay | `16-kkiapay.js` | Mobile Money réel |
| 16b | Fix KKiaPay | `16b-fix-kkiapay.js` | Fix widget + fallback |
| 16c | Fallback KKiaPay | `16c-kkiapay-fallback.js` | Widget → manual |
| 16d | Fallback v2 | `16d-kkiapay-fallback-v2.js` | Détection DOM |
| 17 | Filtre pertinence | `17-relevance-filter.js` | Exclusion blogs |
| 17b→17f | Fix filtre | `17b-*.js` → `17f-*.js` | Itérations v1 → v3 |
| 18 | Nettoyage DB | `18-clean-database.js` | Purge base |
| 18b | Purge DB | `18b-purge-database.js` | Critères avancés |
| 19 | Sources gratuites | `19-free-sources.js` | Google Jobs + Afrique |

---

## 🚀 Installation

```bash
npm install
node 00-architecture.js
node 01-backend-base.js
# ...
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

# Installer tous les modules
node run.js --all

# Réinstaller (écrase)
node 01-backend-base.js --force

# Simuler sans écrire
node 01-backend-base.js --dry-run

# Désinstaller
node 01-backend-base.js --uninstall
```

---

## 📁 Structure

```
job-africa-generator/
├── 00-architecture.js
├── 01-backend-base.js
├── ...
├── 19-free-sources.js
│
├── _lib/           Utilitaires (fs-utils, logger, registry, validator)
├── _config/        Configuration projet
├── _state/         État des modules installés
├── _backups/       Backups horodatés (gitignored)
│
├── backend/        FastAPI + Supabase
├── frontend/       Vue 3 + Vite
├── supabase/       Migrations SQL
│
├── run.js          Runner principal
├── package.json
└── README.md
```

---

## 🔄 Rollback

```bash
# Voir les backups
ls _backups/

# Restaurer
cp _backups/2026-09-26T12-30-45/backend/app/main.py backend/app/main.py

# Ou désinstaller/réinstaller
node 01-backend-base.js --uninstall
node 01-backend-base.js
```

---

## 🐛 Dépannage

**Module échoue avec "prérequis manquants"**
→ Installer d'abord les modules requis (00, et parfois 01)

**Fichiers déjà existants**
→ `--force` pour écraser, `--skip-existing` pour ignorer

**Rollback nécessaire**
→ Consulter `_backups/`

**État corrompu**
→ Supprimer `_state/installed.json` puis réinstaller

---

## 📚 Documentation

- `MODULES.md` — Documentation détaillée des modules
- `SECURITY_NOTES.md` — Notes de sécurité
- `CI_CD_GUIDE.md` — Guide CI/CD
- `backend/README.md` — Backend FastAPI
- `frontend/README.md` — Frontend Vue 3
- `supabase/README.md` — Base de données

---

## 📅 Historique

| Date | Action |
|---|---|
| 17/09 | Modules 00 → 04 (architecture, backend, collecteurs) |
| 18/09 | Modules 05 → 08 (API, dedup, base enrichie, IA) |
| 22/09 | Modules 09 → 12 (frontend, dashboard, auth, i18n) |
| 23/09 | CI/CD + PWA + partage + monétisation + push |
| 24/09 | KKiaPay + toast + boost buttons + fix RLS |
| 25/09 | Filtre v3 + purge DB + sources gratuites |
| 26/09 | Sécurité CORS + fix bugs + nettoyage |
