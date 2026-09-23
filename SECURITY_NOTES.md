# 🔐 Job Africa — Notes de sécurité

## État actuel (23/09/2026)

### Authentification Supabase
- ✅ Middleware FastAPI actif (get_current_user)
- ⚠️ **Confirmation email DÉSACTIVÉE** (pour tests)
- ⚠️ **À réactiver avant mise en production**

### Actions avant production
- [ ] Réactiver confirmation email Supabase
- [ ] Configurer SMTP personnalisé (Resend)
- [ ] Restreindre CORS (`allow_origins` → domaines spécifiques)
- [ ] Activer HTTPS strict
- [ ] Vérifier RLS Supabase sur toutes les tables
- [ ] Configurer Sentry pour le monitoring