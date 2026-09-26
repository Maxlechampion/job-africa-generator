-- ============================================================
-- 20_fix_security.sql — Corrige les vues UNRESTRICTED
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Active security_invoker sur les 3 vues détectées
alter view if exists public.v_job_shares set (security_invoker = true);
alter view if exists public.v_stats_pays set (security_invoker = true);
alter view if exists public.v_top_skills set (security_invoker = true);

-- Vérification
select
    viewname,
    (SELECT option_value FROM pg_options_to_table(reloptions)
     WHERE option_name = 'security_invoker') as security_invoker
from pg_views
where schemaname = 'public'
  and viewname in ('v_job_shares', 'v_stats_pays', 'v_top_skills');

-- Résultat attendu : security_invoker = 'true' pour les 3 vues
