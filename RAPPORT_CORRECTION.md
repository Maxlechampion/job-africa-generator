# Rapport de correction — 26/09/2026 19:19:08

## Corrections appliquées

- AllAfrica : 3 sources désactivées
- 5 sources RSS mortes désactivées
- Liste SOURCES_FIABLES créée
- is_relevant_job : bypass activé
- Scheduler Bénin : OK

## Prochaines étapes

1. Redémarrer Uvicorn :
   ```
   cd backend
   venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload --reload-dir app
   ```

2. Lancer une collecte manuelle :
   ```
   curl.exe -X POST "http://127.0.0.1:8000/admin/scheduler/trigger"
   ```

3. Vérifier en base :
   ```sql
   select source, count(*) from jobs group by source order by count desc;
   ```

4. Commit :
   ```
   git add .
   git commit -m "fix: disable AllAfrica + dead RSS + whitelist sources"
   git push origin main
   ```
