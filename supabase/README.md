# Job Africa — Supabase

Schémas SQL, index et migrations pour Supabase.

## Ordre d'exécution

Exécuter les fichiers SQL **dans l'ordre numérique** dans le SQL Editor de Supabase :

| Ordre | Fichier | Contenu |
|---|---|---|
| 1 | `01_schema.sql` | Tables principales |
| 2 | `02_indexes.sql` | Index de performance |
| 3 | `03_views.sql` | Vues statistiques |
| 4 | `04_rls.sql` | Row Level Security |
| 5 | `05_seed.sql` | Données initiales |
| 6 | `06_auth.sql` | Rôles + hook JWT |
| 7 | `07_shares.sql` | Tracking des partages |
| 8 | `08_monetization.sql` | Transactions + sponsoring |
| 9 | `09_push.sql` | Souscriptions push |

## Comment exécuter

1. Ouvrir https://supabase.com/dashboard
2. Sélectionner ton projet
3. Aller dans **SQL Editor**
4. Copier le contenu d'un fichier
5. Coller et cliquer **Run**
6. Répéter pour chaque fichier dans l'ordre

## Vérification

```sql
-- Lister toutes les tables
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```
