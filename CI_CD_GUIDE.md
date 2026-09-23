# 🚀 Job Africa — Guide CI/CD

Ce guide explique comment configurer l'intégration et le déploiement continus.

---

## 📋 Prérequis

- Repo GitHub : `Maxlechampion/job-africa-generator`
- Compte Render (backend)
- Compte Vercel (frontend)

---

## 🔑 Secrets à configurer dans GitHub

Va sur : **GitHub → Repo → Settings → Secrets and variables → Actions**

### Secrets obligatoires

| Secret | Valeur | Utilisé par |
|---|---|---|
| `RENDER_DEPLOY_HOOK` | URL du Deploy Hook Render | Deploy |
| `VERCEL_TOKEN` | Token Vercel | Deploy |
| `VITE_API_URL` | https://job-africa-generator.onrender.com | Frontend CI |
| `SUPABASE_URL_TEST` | URL Supabase (test) | Backend CI |
| `SUPABASE_KEY_TEST` | Clé Supabase (test) | Backend CI |

### Comment récupérer `RENDER_DEPLOY_HOOK`

1. Va sur https://dashboard.render.com
2. Sélectionne ton service `job-africa-generator`
3. **Settings** → **Deploy Hook**
4. Copie l'URL (ressemble à `https://api.render.com/deploy/srv-xxx?key=yyy`)

### Comment récupérer `VERCEL_TOKEN`

1. Va sur https://vercel.com/account/tokens
2. Clique **Create Token**
3. Nom : `github-actions`
4. Copie le token (ressemble à `vercel_xxxxxxxxxx`)

---

## 🎯 Fonctionnement

### À chaque `git push` sur `main`

1. **Backend CI** s'exécute :
   - Python 3.11 + 3.12
   - Lint Ruff
   - Vérification syntaxe `main.py`
   - Tests pytest

2. **Frontend CI** s'exécute :
   - Node.js 20
   - `npm ci`
   - `npm run build`

3. **Si les 2 CI passent** → **Deploy** :
   - Render redéploie le backend
   - Vercel redéploie le frontend

### En cas d'échec

- ❌ Les tests échouent → **pas de déploiement**
- ❌ Le build échoue → **pas de déploiement**
- ✅ Tu reçois un email GitHub

---

## 🔄 Rollback

### Backend (Render)

1. Va sur https://dashboard.render.com
2. Sélectionne ton service
3. **Deploys** → clique sur un déploiement précédent
4. **Redeploy**

### Frontend (Vercel)

1. Va sur https://vercel.com/dashboard
2. Sélectionne ton projet
3. **Deployments** → clique sur un déploiement précédent
4. **Promote to Production**

---

## 🐛 Debug

### Les workflows ne se déclenchent pas

- Vérifie que tu as bien poussé sur `main`
- Vérifie que les fichiers modifiés sont dans `backend/` ou `frontend/`
- Regarde **GitHub → Actions**

### Le déploiement Render échoue

- Vérifie les logs : **Render → Logs**
- Vérifie que `SUPABASE_URL` et `SUPABASE_KEY` sont bien configurés dans Render
- Vérifie que le `healthCheckPath` (`/health`) répond

### Le déploiement Vercel échoue

- Vérifie les logs : **Vercel → Deployments → Functions**
- Vérifie que `VITE_API_URL` est bien configuré dans Vercel

---

## 📊 État des workflows

Une fois configuré, tu verras dans **GitHub → Actions** :

- ✅ **Backend CI** : passed (30s)
- ✅ **Frontend CI** : passed (45s)
- ✅ **Deploy Production** : passed (1m 30s)

---

## 🎯 Bonnes pratiques

1. **Toujours pusher sur une branche** avant `main`
2. **Créer une Pull Request** pour valider les changements
3. **Vérifier les workflows** avant de merger
4. **Ne jamais pusher directement sur `main`** en production

---

## 📞 Support

En cas de problème :
- GitHub Actions : https://docs.github.com/en/actions
- Render : https://render.com/docs
- Vercel : https://vercel.com/docs
