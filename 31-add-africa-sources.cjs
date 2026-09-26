#!/usr/bin/env node
/**
 * 31-add-africa-sources.cjs — Ajoute les 3 plateformes africaines majeures
 *
 * Sources :
 *   1. Jobberman (Nigeria, Ghana) — scraper HTML
 *   2. Fuzu (Kenya, Nigeria, Uganda) — API officielle JSON
 *   3. EmploiRapide.Net (Côte d'Ivoire, Afrique francophone) — scraper HTML
 *
 * Usage : node 31-add-africa-sources.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');

const SEP = '='.repeat(70);
const log = {
  ok:    (m) => console.log(`\x1b[32m✓\x1b[0m  ${m}`),
  warn:  (m) => console.log(`\x1b[33m⚠\x1b[0m  ${m}`),
  info:  (m) => console.log(`\x1b[34mℹ\x1b[0m  ${m}`),
  title: (m) => console.log(`\n\x1b[1m\x1b[36m${m}\x1b[0m\n`),
};

function backup(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dst = path.join(ROOT, '_backups', ts, rel);
  if (!DRY) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

function write(rel, content) {
  backup(rel);
  const full = path.join(ROOT, rel);
  if (!DRY) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  log.ok(`Écrit : ${rel}`);
}

// ============================================================
console.log(SEP);
console.log('  31-add-africa-sources.cjs');
console.log(SEP);
if (DRY) console.log('\n[DRY-RUN]\n');

// ============================================================
// 1. SCRAPER : Jobberman (Nigeria + Ghana)
// ============================================================
log.title('1. Jobberman (Nigeria + Ghana)');

const JOBBERMAN_SCRAPER = `"""
Scraper Jobberman — Nigeria & Ghana.

Site : https://www.jobberman.com
Couvre : Nigeria, Ghana, Kenya

Structure : schema.org JobPosting (JSON-LD)
"""

import json
import re

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class JobbermanScraper(BaseScraper):
    """Jobberman — Job board (Nigeria/Ghana)."""

    name = "Jobberman"
    base_url = "https://www.jobberman.com"
    country = "Nigeria"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        jobs = []
        seen_urls = set()

        # Pages de recherche
        pages = [
            f"{self.base_url}/jobs",
            f"{self.base_url}/jobs?page=2",
            f"{self.base_url}/jobs?page=3",
        ]

        for url in pages:
            try:
                html = self.scraper.fetch(url, timeout=30)
            except Exception as e:
                self.logger.warning(f"Impossible de charger {url} : {e}")
                continue

            soup = self.scraper.parse(html)

            # ==================== Methode 1 : schema.org JSON-LD ====================
            for script in soup.select('script[type="application/ld+json"]'):
                try:
                    data = json.loads(script.string)

                    # Parfois c'est une liste
                    if isinstance(data, list):
                        for item in data:
                            if item.get("@type") == "JobPosting":
                                job = self._parse_ld(item)
                                if job and job["url"] not in seen_urls:
                                    seen_urls.add(job["url"])
                                    jobs.append(job)
                    elif isinstance(data, dict) and data.get("@type") == "JobPosting":
                        job = self._parse_ld(data)
                        if job and job["url"] not in seen_urls:
                            seen_urls.add(job["url"])
                            jobs.append(job)
                except Exception:
                    continue

            # ==================== Methode 2 : liens HTML ====================
            for link in soup.select('a[href*="/jobs/"]'):
                titre = link.get_text(strip=True)
                href = link.get("href")

                if not titre or not href or len(titre) < 10:
                    continue

                full_url = self.scraper.absolute_url(self.base_url, href)
                if not full_url or full_url in seen_urls:
                    continue

                # Filtre : URL doit contenir un slug
                if not re.search(r"/jobs/[a-z0-9-]+$", full_url):
                    continue

                seen_urls.add(full_url)

                jobs.append(
                    make_job(
                        titre=titre,
                        url=full_url,
                        source="Jobberman",
                        pays="Nigeria",
                    )
                )

        self.logger.info(f"Jobberman : {len(jobs)} offres")
        return jobs

    def _parse_ld(self, data: dict) -> dict | None:
        """Parse un objet JSON-LD schema.org JobPosting."""

        try:
            titre = data.get("title", "").strip()
            if not titre:
                return None

            url = data.get("url", "").strip()
            if not url:
                return None

            # Entreprise
            hiring_org = data.get("hiringOrganization") or {}
            entreprise = hiring_org.get("name") if isinstance(hiring_org, dict) else None

            # Localisation
            loc = data.get("jobLocation") or {}
            if isinstance(loc, list):
                loc = loc[0] if loc else {}

            address = loc.get("address") or {}
            ville = address.get("addressLocality") if isinstance(address, dict) else None
            pays = address.get("addressCountry") if isinstance(address, dict) else None

            if pays == "NG":
                pays = "Nigeria"
            elif pays == "GH":
                pays = "Ghana"
            elif pays == "KE":
                pays = "Kenya"

            # Date
            date_pub = data.get("datePosted")

            return make_job(
                titre=titre,
                url=url,
                source="Jobberman",
                entreprise=entreprise,
                pays=pays or "Nigeria",
                ville=ville,
                date_publication=date_pub,
            )
        except Exception:
            return None
`;

// ============================================================
// 2. COLLECTEUR : Fuzu (API officielle)
// ============================================================
log.title('2. Fuzu (API officielle)');

const FUZU_COLLECTOR = `"""
Collecteur Fuzu — API officielle.

API : https://www.fuzu.com/api/all_jobs
Couvre : Kenya, Nigeria, Uganda, Ghana

L'API retourne du JSON structure, sans cle API.
"""

import httpx

from app.collectors.base import BaseCollector
from app.services.normalizer import clean_text, parse_date


class FuzuCollector(BaseCollector):
    """Fuzu — Job board panafricain (API)."""

    name = "Fuzu"
    country = None
    api_url = "https://www.fuzu.com/api/all_jobs"

    def __init__(self):
        super().__init__()

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Fuzu."""

        headers = {
            "User-Agent": "JobAfricaBot/1.0",
            "Accept": "application/json",
        }

        try:
            with httpx.Client(timeout=30, follow_redirects=True) as client:
                response = client.get(self.api_url, headers=headers)
                response.raise_for_status()
                data = response.json()
        except Exception as e:
            self.logger.error(f"Erreur API Fuzu : {e}")
            return []

        # Structure : {"fuzu_api": [...]}
        if isinstance(data, dict):
            jobs_data = data.get("fuzu_api") or data.get("jobs") or []
        elif isinstance(data, list):
            jobs_data = data
        else:
            jobs_data = []

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        self.logger.info(f"Fuzu : {len(jobs)} offres")
        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Fuzu."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        url = item.get("url")
        if not url:
            return None

        pays = clean_text(item.get("country"))
        ville = clean_text(item.get("location"))

        # Mapping code pays
        country_code = item.get("country_code")
        if country_code:
            mapping = {
                "KE": "Kenya",
                "NG": "Nigeria",
                "UG": "Uganda",
                "GH": "Ghana",
                "TZ": "Tanzanie",
                "RW": "Rwanda",
                "MW": "Malawi",
            }
            pays = mapping.get(country_code, pays)

        # Niveau (junior/mid/senior)
        job_level = item.get("job_level")

        return {
            "titre": titre,
            "entreprise": clean_text(item.get("employer_name")),
            "pays": pays,
            "ville": ville,
            "description": clean_text(item.get("description")),
            "type_contrat": None,
            "niveau": job_level,
            "categorie": None,
            "date_publication": parse_date(item.get("campaign_start_date")),
            "date_expiration": parse_date(item.get("campaign_end_date")),
            "url": url,
            "source": "Fuzu",
            "teletravail": False,
        }
`;

// ============================================================
// 3. SCRAPER : EmploiRapide.Net (Côte d'Ivoire)
// ============================================================
log.title('3. EmploiRapide.Net (Côte d\'Ivoire)');

const EMPLOIRAPIDE_SCRAPER = `"""
Scraper EmploiRapide.Net — Côte d'Ivoire / Afrique francophone.

Site : https://emploirapide.net
Fonde par Sebastien Kouassi (2025).
Agrege des milliers d'offres locales et internationales.
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class EmploiRapideScraper(BaseScraper):
    """EmploiRapide.Net — Agregateur (Côte d'Ivoire)."""

    name = "EmploiRapide"
    base_url = "https://emploirapide.net"
    country = "Cote d'Ivoire"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        jobs = []
        seen_urls = set()

        # Pages (a ajuster selon structure)
        pages = [
            f"{self.base_url}/",
            f"{self.base_url}/offres",
            f"{self.base_url}/emplois",
        ]

        for url in pages:
            try:
                html = self.scraper.fetch(url, timeout=30)
            except Exception as e:
                self.logger.warning(f"Impossible de charger {url} : {e}")
                continue

            soup = self.scraper.parse(html)

            # Cherche les liens d'offres
            selectors = [
                'a[href*="/offre"]',
                'a[href*="/emploi"]',
                'a[href*="/job"]',
                'article a',
            ]

            for sel in selectors:
                for link in soup.select(sel):
                    titre = link.get_text(strip=True)
                    href = link.get("href")

                    if not titre or not href or len(titre) < 8:
                        continue

                    full_url = self.scraper.absolute_url(self.base_url, href)
                    if not full_url or full_url in seen_urls:
                        continue

                    # Filtre : doit contenir un slug
                    if not any(k in full_url.lower() for k in ["/offre", "/emploi", "/job"]):
                        continue

                    seen_urls.add(full_url)

                    jobs.append(
                        make_job(
                            titre=titre,
                            url=full_url,
                            source="EmploiRapide",
                            pays="Cote d'Ivoire",
                        )
                    )

        self.logger.info(f"EmploiRapide : {len(jobs)} offres")
        return jobs
`;

// ============================================================
// 4. Enregistrer les fichiers
// ============================================================
log.title('4. Créer les fichiers');

write(
  'backend/app/collectors/scrapers/sources/jobberman.py',
  JOBBERMAN_SCRAPER
);

write(
  'backend/app/collectors/sources/fuzu.py',
  FUZU_COLLECTOR
);

write(
  'backend/app/collectors/scrapers/sources/emploirapide.py',
  EMPLOIRAPIDE_SCRAPER
);

// ============================================================
// 5. Patch scheduler.py pour ajouter les 3 sources
// ============================================================
log.title('5. Patch scheduler.py');

const schedulerPath = 'backend/app/services/scheduler.py';
const schedulerFull = path.join(ROOT, schedulerPath);

if (fs.existsSync(schedulerFull)) {
  let content = fs.readFileSync(schedulerFull, 'utf8');

  // Imports
  if (!content.includes('JobbermanScraper')) {
    content = content.replace(
      /^(from app\.collectors\.google_jobs import GoogleJobsCollector)/m,
      `$1
from app.collectors.scrapers.sources.jobberman import JobbermanScraper
from app.collectors.scrapers.sources.emploirapide import EmploiRapideScraper
from app.collectors.sources.fuzu import FuzuCollector`
    );
    log.ok('Imports ajoutés');
  }

  // Bloc AFRICA_SOURCES
  if (!content.includes('AFRICA_SOURCES')) {
    const africaBlock = `


# ==================== SOURCES AFRIQUE (Jobberman + Fuzu + EmploiRapide) ====================
AFRICA_SOURCES = [
    JobbermanScraper,       # Nigeria / Ghana
    FuzuCollector,          # Kenya / Nigeria / Uganda
    EmploiRapideScraper,    # Cote d'Ivoire
]


def run_africa_collectors() -> dict:
    """Lance les sources africaines majeures."""

    logger.info("-" * 60)
    logger.info("Collecte sources Afrique...")
    logger.info("-" * 60)

    total_collected = 0
    total_inserted = 0
    total_errors = 0
    details = []

    for SourceClass in AFRICA_SOURCES:
        source = SourceClass()
        name = source.name
        source_start = time.time()

        try:
            jobs = source.collect()
            collected = len(jobs)

            if collected == 0:
                details.append({
                    "source": name,
                    "status": "empty",
                    "collected": 0,
                })
                logger.info(f"  [SKIP] {name} : aucune offre")
                continue

            result = bulk_create_jobs(jobs)
            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted

            duree = time.time() - source_start

            details.append({
                "source": name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
                "duration": round(duree, 2),
            })

            logger.info(
                f"  [OK] {name} : {collected} collectees, "
                f"{inserted} inserees, {skipped} ignorees ({duree:.1f}s)"
            )

        except Exception as e:
            total_errors += 1
            error_msg = str(e)[:200]
            details.append({
                "source": name,
                "status": "error",
                "error": error_msg,
            })
            logger.error(f"  [ERR] {name} : {error_msg}")

    return {
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_errors": total_errors,
        "details": details,
    }
`;

    // Insère avant "Nettoyage"
    content = content.replace(
      /# ==================== Nettoyage ====================/,
      africaBlock + '\n# ==================== Nettoyage ===================='
    );
    log.ok('Bloc AFRICA_SOURCES ajouté');
  }

  // Ajoute l'appel dans le wrapper Bénin
  if (!content.includes('run_africa_collectors()')) {
    content = content.replace(
      /(benin = run_benin_collectors\(\))/,
      `$1

    # ==================== COLLECTE AFRIQUE ====================
    africa = run_africa_collectors()

    result["total_collected"] += africa["total_collected"]
    result["total_inserted"] += africa["total_inserted"]
    result["total_errors"] += africa["total_errors"]
    result["details"].extend(africa["details"])`
    );
    log.ok('Appel Afrique intégré dans le wrapper');
  }

  if (!DRY) {
    backup(schedulerPath);
    fs.writeFileSync(schedulerFull, content, 'utf8');
  }
  log.ok('scheduler.py mis à jour');
} else {
  log.warn(`Fichier introuvable : ${schedulerPath}`);
}

// ============================================================
// 6. Patch admin_sources_test.py pour ajouter les 3 sources
// ============================================================
log.title('6. Patch admin_sources_test.py');

const apiPath = 'backend/app/api/admin_sources_test.py';
const apiFull = path.join(ROOT, apiPath);

if (fs.existsSync(apiFull)) {
  let content = fs.readFileSync(apiFull, 'utf8');

  if (!content.includes('JobbermanScraper')) {
    // Ajoute les imports
    content = content.replace(
      /def _get_testable_sources\(\) -> dict:/,
      `def _get_testable_sources() -> dict:`
    );

    // Ajoute les nouvelles sources dans le dict
    const newSources = `
    try:
        from app.collectors.scrapers.sources.jobberman import JobbermanScraper
        sources["jobberman"] = JobbermanScraper
    except ImportError:
        pass

    try:
        from app.collectors.scrapers.sources.emploirapide import EmploiRapideScraper
        sources["emploirapide"] = EmploiRapideScraper
    except ImportError:
        pass

    try:
        from app.collectors.sources.fuzu import FuzuCollector
        sources["fuzu"] = FuzuCollector
    except ImportError:
        pass
`;

    // Insère avant "return sources"
    content = content.replace(
      /(\n\s+return sources)/,
      `${newSources}$1`
    );

    if (!DRY) {
      backup(apiPath);
      fs.writeFileSync(apiFull, content, 'utf8');
    }
    log.ok('admin_sources_test.py mis à jour');
  }
}

// ============================================================
// 7. Résumé
// ============================================================
console.log('\n' + SEP);
console.log('  ✅ SOURCES AFRIQUE AJOUTÉES');
console.log(SEP + '\n');

console.log('  Nouvelles sources :');
console.log('  - Jobberman (Nigeria/Ghana)      → scraper HTML + JSON-LD');
console.log('  - Fuzu (Kenya/Nigeria/Uganda)    → API officielle');
console.log('  - EmploiRapide (Côte d\'Ivoire)    → scraper HTML');
console.log('');
console.log('  Endpoints de test :');
console.log('  GET /admin/sources/test?source=jobberman');
console.log('  GET /admin/sources/test?source=fuzu');
console.log('  GET /admin/sources/test?source=emploirapide');
console.log('');
console.log('  Prochaines étapes :');
console.log('  1. Redémarrer Uvicorn');
console.log('  2. Tester chaque source :');
console.log('     curl.exe "http://127.0.0.1:8000/admin/sources/test?source=fuzu"');
console.log('  3. Lancer une collecte complète :');
console.log('     curl.exe -X POST "http://127.0.0.1:8000/admin/scheduler/trigger"');
console.log('');
console.log(SEP);