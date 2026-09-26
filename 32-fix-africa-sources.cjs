#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  32-fix-africa-sources.cjs — Correction des 3 sources Afrique
 * ═══════════════════════════════════════════════════════════════
 *
 * Corrige :
 *   1. Jobberman : sélecteur /listings/ + classes exactes
 *   2. Fuzu : headers Origin/Referer + parsing tolérant
 *   3. EmploiRapide : diagnostic automatique (log la structure)
 *
 * Usage : node 32-fix-africa-sources.cjs [--dry-run]
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
console.log('  32-fix-africa-sources.cjs');
console.log(SEP);
if (DRY) console.log('\n[DRY-RUN]\n');

// ============================================================
// 1. JOBBERMAN — Sélecteurs corrigés
// ============================================================
log.title('1. Jobberman — /listings/ + classes exactes');

const JOBBERMAN = `"""
Scraper Jobberman — Nigeria & Ghana.

Site : https://www.jobberman.com
URL des offres : /listings/<slug>-<id>
Structure : div avec classes flex flex-wrap col-span-1
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

            # ==================== Methode 1 : JSON-LD ====================
            for script in soup.select('script[type="application/ld+json"]'):
                try:
                    data = json.loads(script.string)
                    items = data if isinstance(data, list) else [data]

                    for item in items:
                        if item.get("@type") == "JobPosting":
                            job = self._parse_ld(item)
                            if job and job["url"] not in seen_urls:
                                seen_urls.add(job["url"])
                                jobs.append(job)
                except Exception:
                    continue

            # ==================== Methode 2 : liens /listings/ ====================
            for link in soup.select('a[href*="/listings/"]'):
                titre = link.get_text(strip=True)
                href = link.get("href")

                if not titre or not href or len(titre) < 10:
                    continue

                # Ignore les faux titres (classes generiques)
                if titre.lower() in ("apply now", "apply", "view job", "voir"):
                    continue

                full_url = self.scraper.absolute_url(self.base_url, href)
                if not full_url or full_url in seen_urls:
                    continue

                # Filtre : URL doit contenir /listings/<slug>
                if not re.search(r"/listings/[a-z0-9-]+", full_url):
                    continue

                seen_urls.add(full_url)

                # Extrait le pays depuis le titre ou la page
                pays = self._detect_country(titre, full_url)

                jobs.append(
                    make_job(
                        titre=titre,
                        url=full_url,
                        source="Jobberman",
                        pays=pays,
                    )
                )

        self.logger.info(f"Jobberman : {len(jobs)} offres collectees")
        return jobs

    def _detect_country(self, titre: str, url: str) -> str:
        """Detecte le pays depuis le titre ou l'URL."""

        text = f"{titre} {url}".lower()

        if "ghana" in text or "accra" in text or "-gh-" in text:
            return "Ghana"
        if "kenya" in text or "nairobi" in text or "-ke-" in text:
            return "Kenya"

        return "Nigeria"

    def _parse_ld(self, data: dict) -> dict | None:
        """Parse un objet schema.org JobPosting."""

        try:
            titre = data.get("title", "").strip()
            if not titre or len(titre) < 10:
                return None

            url = data.get("url", "").strip()
            if not url:
                return None

            hiring_org = data.get("hiringOrganization") or {}
            entreprise = hiring_org.get("name") if isinstance(hiring_org, dict) else None

            # Localisation
            loc = data.get("jobLocation") or {}
            if isinstance(loc, list):
                loc = loc[0] if loc else {}

            address = loc.get("address") or {}
            ville = address.get("addressLocality") if isinstance(address, dict) else None
            country_code = address.get("addressCountry") if isinstance(address, dict) else None

            country_map = {"NG": "Nigeria", "GH": "Ghana", "KE": "Kenya"}
            pays = country_map.get(country_code, "Nigeria")

            return make_job(
                titre=titre,
                url=url,
                source="Jobberman",
                entreprise=entreprise,
                pays=pays,
                ville=ville,
                date_publication=data.get("datePosted"),
            )
        except Exception:
            return None
`;

write("backend/app/collectors/scrapers/sources/jobberman.py", JOBBERMAN);

// ============================================================
// 2. FUZU — Headers corrects + parsing tolérant
// ============================================================
log.title('2. Fuzu — Headers + parsing tolérant');

const FUZU = `"""
Collecteur Fuzu — API officielle.

API : https://www.fuzu.com/api/all_jobs

Headers Origin/Referer requis pour eviter le 403.
"""

import httpx

from app.collectors.base import BaseCollector
from app.services.normalizer import clean_text, parse_date


class FuzuCollector(BaseCollector):
    """Fuzu — Job board panafricain (API)."""

    name = "Fuzu"
    api_url = "https://www.fuzu.com/api/all_jobs"

    def __init__(self):
        super().__init__()

    def collect(self) -> list[dict]:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": "https://www.fuzu.com",
            "Referer": "https://www.fuzu.com/",
        }

        try:
            with httpx.Client(timeout=30, follow_redirects=True) as client:
                response = client.get(self.api_url, headers=headers)

                self.logger.info(
                    f"Fuzu HTTP {response.status_code} — "
                    f"{len(response.text)} car."
                )

                if response.status_code != 200:
                    self.logger.warning(
                        f"Fuzu repond {response.status_code}"
                    )
                    return []

                data = response.json()

        except Exception as e:
            self.logger.error(f"Erreur API Fuzu : {e}")
            return []

        # ==================== Analyse de la structure ====================
        jobs_data = []

        if isinstance(data, dict):
            # Cherche une cle contenant une liste
            for key in ("fuzu_api", "jobs", "data", "results", "items", "all_jobs"):
                value = data.get(key)
                if isinstance(value, list):
                    jobs_data = value
                    self.logger.info(f"Fuzu : cle '{key}' -> {len(value)} elements")
                    break

            if not jobs_data:
                self.logger.warning(
                    f"Fuzu : structure inattendue. Cles : {list(data.keys())[:10]}"
                )
        elif isinstance(data, list):
            jobs_data = data
            self.logger.info(f"Fuzu : liste directe -> {len(data)} elements")

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        self.logger.info(f"Fuzu : {len(jobs)} offres parsees")
        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Fuzu avec differents formats de cles."""

        if not isinstance(item, dict):
            return None

        # Le titre peut etre Title, title, job_title
        titre = clean_text(
            item.get("Title") or item.get("title") or item.get("job_title")
        )
        if not titre:
            return None

        # URL
        url = (
            item.get("URL")
            or item.get("url")
            or item.get("job_url")
            or item.get("link")
        )

        if not url and item.get("slug"):
            url = f"https://www.fuzu.com/job/{item['slug']}"

        if not url:
            return None

        # Pays
        pays = clean_text(
            item.get("Country") or item.get("country") or item.get("location")
        )

        # Code pays
        country_code = item.get("Country_code") or item.get("country_code")
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
            pays = mapping.get(country_code.upper(), pays)

        return {
            "titre": titre,
            "entreprise": clean_text(
                item.get("Employer_name")
                or item.get("employer_name")
                or item.get("company")
            ),
            "pays": pays,
            "ville": clean_text(item.get("Location") or item.get("city")),
            "description": clean_text(
                item.get("Description") or item.get("description")
            ),
            "type_contrat": None,
            "niveau": item.get("Job_level") or item.get("job_level"),
            "categorie": None,
            "date_publication": parse_date(
                item.get("Campaign_start_date")
                or item.get("created_at")
                or item.get("date_posted")
            ),
            "date_expiration": parse_date(
                item.get("Campaign_end_date") or item.get("expires_at")
            ),
            "url": url,
            "source": "Fuzu",
            "teletravail": bool(item.get("is_remote", False)),
        }
`;

write("backend/app/collectors/sources/fuzu.py", FUZU);

// ============================================================
// 3. EMPLOIRAPIDE — Diagnostic automatique
// ============================================================
log.title('3. EmploiRapide — Diagnostic + scraping générique');

const EMPLOIRAPIDE = `"""
Scraper EmploiRapide.Net — Cote d'Ivoire / Afrique francophone.

Site : https://emploirapide.net

Le scraper teste plusieurs selecteurs et log ceux qui fonctionnent.
"""

import re

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class EmploiRapideScraper(BaseScraper):
    """EmploiRapide.Net — Agregateur (Cote d'Ivoire)."""

    name = "EmploiRapide"
    base_url = "https://emploirapide.net"
    country = "Cote d'Ivoire"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        jobs = []
        seen_urls = set()

        # Pages a essayer
        pages = [
            f"{self.base_url}/",
            f"{self.base_url}/offres",
            f"{self.base_url}/emplois",
            f"{self.base_url}/jobs",
            f"{self.base_url}/annonces",
        ]

        working_page = None

        for url in pages:
            try:
                html = self.scraper.fetch(url, timeout=30)
                if len(html) > 5000:
                    self.logger.info(
                        f"EmploiRapide : page valide {url} ({len(html)} car.)"
                    )
                    working_page = (url, html)
                    break
            except Exception as e:
                self.logger.debug(f"Page invalide {url} : {e}")
                continue

        if not working_page:
            self.logger.warning("EmploiRapide : aucune page accessible")
            return []

        url, html = working_page
        soup = self.scraper.parse(html)

        # ==================== Diagnostic ====================
        self.logger.info("EmploiRapide : diagnostic des selecteurs")
        for sel in ['article', '.job', '.emploi', '.offre', 'li a', 'h2 a', 'h3 a']:
            elems = soup.select(sel)
            if elems:
                self.logger.info(f"  {sel} : {len(elems)} elements")

        # ==================== Extraction ====================
        # Cherche tous les liens qui ressemblent a une offre
        links = soup.select('a[href]')

        for link in links:
            href = link.get("href", "")
            titre = link.get_text(strip=True)

            if not titre or not href or len(titre) < 10:
                continue

            # Filtre : URL doit contenir un mot-cle d'offre
            keywords = ["/offre", "/emploi", "/job", "/annonce", "/poste"]
            if not any(k in href.lower() for k in keywords):
                continue

            # Rejette les liens de navigation
            nav_words = ["accueil", "home", "contact", "about", "login", "register"]
            if any(w in href.lower() for w in nav_words):
                continue

            # Rejette les titres trop courts ou trop generiques
            if titre.lower() in ("voir plus", "lire la suite", "details", "postuler"):
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url or full_url in seen_urls:
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

        self.logger.info(f"EmploiRapide : {len(jobs)} offres collectees")
        return jobs
`;

write("backend/app/collectors/scrapers/sources/emploirapide.py", EMPLOIRAPIDE);

// ============================================================
// 4. Vérification scheduler
// ============================================================
log.title('4. Vérification scheduler');

const schedulerPath = 'backend/app/services/scheduler.py';
const scheduler = fs.readFileSync(path.join(ROOT, schedulerPath), 'utf8');

const checks = {
  'JobbermanScraper': scheduler.includes('JobbermanScraper'),
  'FuzuCollector': scheduler.includes('FuzuCollector'),
  'EmploiRapideScraper': scheduler.includes('EmploiRapideScraper'),
  'AFRICA_SOURCES': scheduler.includes('AFRICA_SOURCES'),
  'run_africa_collectors()': scheduler.includes('africa = run_africa_collectors()'),
};

for (const [check, status] of Object.entries(checks)) {
  if (status) {
    log.ok(check);
  } else {
    log.warn(`MANQUANT : ${check}`);
  }
}

// ============================================================
// 5. Résumé
// ============================================================
console.log('\n' + SEP);
console.log('  ✅ CORRECTIONS APPLIQUÉES');
console.log(SEP + '\n');

console.log('  Corrections :');
console.log('  - Jobberman : /listings/ + classes exactes + JSON-LD');
console.log('  - Fuzu : headers Origin/Referer + parsing tolerant');
console.log('  - EmploiRapide : diagnostic + selecteurs elargis');
console.log('');
console.log('  Prochaines etapes :');
console.log('  1. Redemarrer Uvicorn (Ctrl+C puis relance)');
console.log('  2. Tester chaque source :');
console.log('     curl.exe "http://127.0.0.1:8000/admin/sources/test?source=jobberman"');
console.log('     curl.exe "http://127.0.0.1:8000/admin/sources/test?source=fuzu"');
console.log('     curl.exe "http://127.0.0.1:8000/admin/sources/test?source=emploirapide"');
console.log('  3. Verifier les logs Uvicorn pour les diagnostics');
console.log('');
console.log(SEP);