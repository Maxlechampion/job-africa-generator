# 📋 Job Africa — Documentation des modules

Ce document décrit la **numérotation finale** des modules du projet
et clarifie les doublons détectés.

---

## 🎯 Modules installés (confirmés)

État réel basé sur `_state/installed.json` :

| # | Module | Fichier JS | Date | Statut |
|---|---|---|---|---|
| 00 | Architecture | `00-architecture.js` | 17/09 | ✅ |
| 01 | Backend Base | `01-backend-base.js` | 17/09 | ✅ |
| 02 | Collecteurs RSS | `02-collectors.js` | 17/09 | ✅ |
| 03 | Scheduler | `03-scheduler.js` | 17/09 | ✅ |
| 03.5 | ATS Collector | `04-ats-collector.js` | 17/09 | ✅ |
| 04 | Scraper HTML | `04-scraper-html.js` | 17/09 | ✅ |
| 05 | API Collector | `05-api-collector.js` | 18/09 | ✅ |
| 06 | Déduplication | `06-deduplication.js` | 18/09 | ✅ |
| 07 | Base enrichie | `07-database-enriched.js` | 18/09 | ✅ |
| 08 | IA Hugging Face | `08-ai-huggingface.js` | 18/09 | ✅ |
| 09 | Frontend Vue | `09-frontend-vue.js` | 22/09 | ✅ |
| 10 | Dashboard Admin | `10-admin-dashboard.js` | 22/09 | ✅ |
| 11 | Auth Supabase | `11-auth-supabase.js` | 22/09 | ✅ |
| 12 | Multi-langue | `12-i18n.js` | 22/09 | ✅ |

**Total : 14 modules installés**

---

## ❌ Modules restants à installer

| # | Module | Fichier JS | Priorité |
|---|---|---|---|
| 13 | Partage social | `13-social-share.js` | 🔴 Haute |
| 14 | Monétisation | `14-monetization.js` | 🔴 Haute |
| 15 | Notifications push | `15-push-notifications.js` | 🔴 Haute |
| 09b | CI/CD | `09-cicd-deployment.js` | 🟡 Moyenne |
| 10b | PWA | `10-pwa.js` | 🟡 Moyenne |

---

## ⚠️ Fichiers JS en double (à nettoyer)

Ces fichiers existent mais **ne sont pas utilisés** par la version installée :

| Fichier | Statut | Remplacé par |
|---|---|---|
| `04-deduplication.js` | 🗑️ Obsolète | `06-deduplication.js` |
| `04-ats-collector.js` | ✅ Utilisé | — |
| `05-ai-huggingface.js` | 🗑️ Obsolète | `08-ai-huggingface.js` |
| `06-database-enriched.js` | 🗑️ Obsolète | `07-database-enriched.js` |
| `07-frontend-vue.js` | 🗑️ Obsolète | `09-frontend-vue.js` |
| `08-admin-dashboard.js` | 🗑️ Obsolète | `10-admin-dashboard.js` |
| `09-cicd-deployment.js` | 📌 À venir | — |
| `10-pwa.js` | 📌 À venir | — |

**Recommandation** : renommer les fichiers obsolètes en `.bak` (pas de suppression).

---

## 🗄️ Tables Supabase (13 tables)

D'après `information_schema.tables` :

| Table | Rôle | Module |
|---|---|---|
| `jobs` | Offres d'emploi | 01 |
| `collect_logs` | Journal des collectes | 03 |
| `companies` | Entreprises | 07 |
| `skills` | Compétences | 07 |
| `job_skills` | Relation offre ↔ compétence | 07 |
| `sources` | Sources de collecte | 07 |
| `favorites` | Favoris utilisateur | 07 |
| `alerts` | Alertes email/push | 07 |
| `alert_notifications` | Historique notifications | 07 |
| `users` | Profils utilisateurs | 11 |
| `user_roles` | Rôles (user/admin) | 11 |
| `v_stats_pays` | Vue statistiques pays | 07 |
| `v_top_skills` | Vue top compétences | 07 |

---

## 🔌 Routers Backend (16 routers)

| Router | Fichier | Module |
|---|---|---|
| `jobs` | `api/jobs.py` | 01 |
| `stats` | `api/stats.py` | 01 |
| `collect` | `api/collect.py` | 02 |
| `admin` | `api/admin.py` | 03 |
| `collect_ats` | `api/collect_ats.py` | 03.5 |
| `collect_scrapers` | `api/collect_scrapers.py` | 04 |
| `collect_api` | `api/collect_api.py` | 05 |
| `admin_dedup` | `api/admin_dedup.py` | 06 |
| `companies` | `api/companies.py` | 07 |
| `skills` | `api/skills.py` | 07 |
| `favorites` | `api/favorites.py` | 07 |
| `alerts` | `api/alerts.py` | 07 |
| `admin_sources` | `api/admin_sources.py` | 07 |
| `ai` | `api/ai.py` | 08 |
| `dashboard` | `api/dashboard.py` | 10 |
| `auth` | `api/auth.py` | 11 |

---

## 🎨 Routes Frontend (10 routes)

| Route | Vue | Module |
|---|---|---|
| `/:lang?/` | HomeView | 09 |
| `/:lang?/jobs` | JobsView | 09 |
| `/:lang?/jobs/:id` | JobDetailView | 09 |
| `/:lang?/stats` | StatsView | 09 |
| `/:lang?/login` | LoginView | 11 |
| `/:lang?/signup` | SignupView | 11 |
| `/:lang?/reset-password` | ResetPasswordView | 11 |
| `/:lang?/account` | AccountView | 11 |
| `/:lang?/admin` | AdminView | 10 |
| `/:lang?/*` | NotFoundView | 09 |

**Note** : `/:lang?` = préfixe optionnel `fr` ou `en` (module 12).

---

## 🚀 Prochaines étapes

1. ✅ **Stabilisation** (ce module)
2. ⏳ **Module 13** — Partage social
3. ⏳ **Module 15** — Notifications push
4. ⏳ **Module 14** — Monétisation
5. ⏳ **Module 09b** — CI/CD
6. ⏳ **Module 10b** — PWA

---

## 📅 Historique

| Date | Action |
|---|---|
| 17/09 | Installation modules 00 → 04 |
| 18/09 | Installation modules 05 → 08 |
| 22/09 | Installation modules 09 → 12 |
| 23/09 | Stabilisation (fix main.py + docs) |
