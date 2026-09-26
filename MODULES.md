# 📋 Job Africa — Documentation des modules

Documentation détaillée de la numérotation et de l'état des modules.

---

## 🎯 Modules installés

| # | Module | Fichier | Description | Statut |
|---|---|---|---|---|
| 00 | Architecture | `00-architecture.js` | Arborescence + .gitignore | ✅ |
| 01 | Backend Base | `01-backend-base.js` | FastAPI + Supabase + Pydantic | ✅ |
| 02 | Collecteurs RSS | `02-collectors.js` | RSS générique + 4 sources | ✅ |
| 03 | Scheduler | `03-scheduler.js` | APScheduler + logs | ✅ |
| 03.5 | ATS Collector | `04-ats-collector.js` | Greenhouse + Ashby | ✅ |
| 04 | Scraper HTML | `04-scraper-html.js` | HTML + Playwright + PDF | ✅ |
| 05 | API Collector | `05-api-collector.js` | ProGigFinder + Fuzu | ✅ |
| 06 | Déduplication | `06-deduplication.js` | Dedup + catégorisation | ✅ |
| 07 | Base enrichie | `07-database-enriched.js` | 15+ tables + services | ✅ |
| 08 | IA Hugging Face | `08-ai-huggingface.js` | Résumé, skills, langue | ✅ |
| 09 | Frontend Vue | `09-frontend-vue.js` | Vue 3 + Vite + Pinia | ✅ |
| 09b | CI/CD | `09b-cicd-deployment.js` | GitHub Actions + Render + Vercel | ✅ |
| 10 | Dashboard Admin | `10-admin-dashboard.js` | Chart.js + KPIs | ✅ |
| 10b | PWA | `10b-pwa.js` | Installable Android + iOS | ✅ |
| 11 | Auth Supabase | `11-auth-supabase.js` | Login + rôles + JWT | ✅ |
| 12 | Multi-langue | `12-i18n.js` | FR / EN + hreflang | ✅ |
| 13 | Partage social | `13-social-share.js` | WhatsApp, LinkedIn, QR | ✅ |
| 14 | Monétisation | `14-monetization.js` | Mobile Money + cartes | ✅ |
| 14b | Page Tarifs | `14b-pricing-page.js` | Page /pricing | ✅ |
| 15 | Push | `15-push-notifications.js` | Web Push + VAPID | ✅ |
| 15b | Boutons Booster | `15b-boost-buttons.js` | Bouton sur les offres | ✅ |
| 15c | Fix use_admin | `15c-fix-use-admin.js` | Bypass RLS backend | ✅ |
| 15d | Payment Toast | `15d-payment-toast.js` | Notification paiement | ✅ |
| 16 | KKiaPay | `16-kkiapay.js` | Mobile Money réel | ✅ |
| 16b | Fix KKiaPay | `16b-fix-kkiapay.js` | Fix widget | ✅ |
| 16c | Fallback KKiaPay | `16c-kkiapay-fallback.js` | Widget → manual | ✅ |
| 16d | Fallback v2 | `16d-kkiapay-fallback-v2.js` | Détection DOM | ✅ |
| 17 | Filtre pertinence | `17-relevance-filter.js` | Exclusion blogs v1 | ✅ |
| 17b | Integration filtre | `17b-integrate-filter.js` | Intégration dans job_service | ✅ |
| 17c | Fix dedup | `17c-fix-filter-and-dedup.js` | Dedup + seuil | ✅ |
| 17d | Filtre v3 | `17d-fix-filter-v3.js` | Préfixes pays + politique | ✅ |
| 17e | Décodage HTML | `17e-fix-html-decode.js` | `html.unescape` | ✅ |
| 17f | Fix ordre | `17f-fix-filter-order.js` | Normaliser avant filtrer | ✅ |
| 18 | Nettoyage DB | `18-clean-database.js` | Script de purge | ✅ |
| 18b | Purge DB | `18b-purge-database.js` | Critères avancés | ✅ |
| 19 | Sources gratuites | `19-free-sources.js` | Google Jobs + Afrique | ✅ |

**Total : 36 modules installés**

---

## 🗄️ Tables Supabase (18 tables + 3 vues)

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
| `transactions` | Paiements | 14 |
| `subscriptions` | Abonnements | 14 |
| `banners` | Bannières pub | 14 |
| `shares` | Tracking partages | 13 |
| `push_subscriptions` | Souscriptions push | 15 |
| `v_job_shares` | Vue statistiques partages | 13 |
| `v_stats_pays` | Vue statistiques pays | 07 |
| `v_top_skills` | Vue top compétences | 07 |

---

## 🔌 Routers Backend (25 routers)

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
| `share` | `api/share.py` | 13 |
| `payments` | `api/payments.py` | 14 |
| `premium` | `api/premium.py` | 14 |
| `sponsored` | `api/sponsored.py` | 14 |
| `push` | `api/push.py` | 15 |
| `webhooks` | `api/webhooks.py` | 16 |

---

## 🎨 Routes Frontend

| Route | Vue | Module |
|---|---|---|
| `/:lang?/` | HomeView | 09 |
| `/:lang?/jobs` | JobsView | 09 |
| `/:lang?/jobs/:id` | JobDetailView | 09 |
| `/:lang?/stats` | StatsView | 09 |
| `/:lang?/pricing` | PricingView | 14b |
| `/:lang?/login` | LoginView | 11 |
| `/:lang?/signup` | SignupView | 11 |
| `/:lang?/reset-password` | ResetPasswordView | 11 |
| `/:lang?/account` | AccountView | 11 |
| `/:lang?/admin` | AdminView | 10 |

---

## 🚀 Production

- **Backend** : https://job-africa-generator.onrender.com
- **Frontend** : https://frontend-zeta-six-12mzm0ovel.vercel.app
- **Base** : https://gqqmhlwtvtixayystsyw.supabase.co

---

## 📅 Historique

| Date | Action |
|---|---|
| 17/09 | Modules 00 → 04 |
| 18/09 | Modules 05 → 08 |
| 22/09 | Modules 09 → 12 |
| 23/09 | CI/CD + PWA + partage + monétisation + push |
| 24/09 | KKiaPay + toast + fix RLS |
| 25/09 | Filtre v3 + purge DB + sources gratuites |
| 26/09 | Sécurité CORS + fix bugs + nettoyage |
