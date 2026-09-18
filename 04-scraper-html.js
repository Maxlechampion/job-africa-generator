#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 04 — SCRAPER HTML (BeautifulSoup + Playwright)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute la couche de scraping HTML pour les sites sans RSS ni API :
 *   - Flutterwave, Paystack, Kuda (fintechs africaines)
 *   - CFAO Careers (multi-pays)
 *   - Zonemploi (Niger)
 *   - Maliweb (Mali)
 *   - MyJobMag (Nigeria)
 *   - Bénin Web TV (Bénin)
 *
 * USAGE :
 *   node 04-scraper-html.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle (écrase les fichiers)
 *   --dry-run        Simule sans écrire
 *   --uninstall      Désinstalle le module
 *   --with-playwright  Installe Playwright en plus
 *
 * PRÉREQUIS :
 *   - Module 00, 01, 02 installés
 *   - Module 03.5 (ATS) recommandé
 *
 * DÉPENDANCES :
 *   - beautifulsoup4, lxml (déjà dans requirements.txt)
 *   - playwright (optionnel, à installer séparément)
 *   - pdfplumber (optionnel)
 *
 * FICHIERS CRÉÉS (14) :
 *   Voir arborescence ci-dessus
 *
 * FICHIERS MODIFIÉS (1) :
 *   backend/app/main.py  (ajout router collect_scrapers)
 *
 * ═══════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";

import { exists, writeFiles, removeFile, ROOT } from "./_lib/fs-utils.js";
import { log } from "./_lib/logger.js";
import { markInstalled, markUninstalled, isInstalled } from "./_lib/registry.js";
import { validateRequirements } from "./_lib/validator.js";

const args = process.argv.slice(2);
const OPTIONS = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  uninstall: args.includes("--uninstall"),
  withPlaywright: args.includes("--with-playwright"),
  verbose: args.includes("--verbose"),
};

const MODULE_ID = "04";
const MODULE_NAME = "Scraper HTML";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/services/job_service.py",
  "backend/app/services/normalizer.py",
  "backend/app/collectors/base.py",
];

// ==================== Contenu des fichiers ====================

const SCRAPERS_INIT = `"""
Collecteurs par scraping HTML.

Ce module gere les sources qui n'ont ni RSS ni API publique.
Utilise BeautifulSoup pour HTML statique, Playwright pour JS.
"""
`;

const BASE_SCRAPER = `"""
Classe de base pour tous les scrapers HTML.
"""

from abc import ABC, abstractmethod

from app.core.logger import get_logger


class BaseScraper(ABC):
    """
    Classe abstraite pour les scrapers HTML.

    Attributs a definir :
        name        : Nom de la source
        base_url    : URL de base du site
        country     : Pays par defaut
        categorie   : Categorie par defaut
    """

    name: str = "base_scraper"
    base_url: str = ""
    country: str | None = None
    categorie: str | None = None

    def __init__(self):
        self.logger = get_logger(f"scraper.{self.name}")

    @abstractmethod
    def collect(self) -> list[dict]:
        """Recupere les offres depuis le site."""
        pass

    def safe_collect(self) -> list[dict]:
        """Wrapper avec gestion d'erreur."""

        try:
            self.logger.info(f"Scraping : {self.name}")
            jobs = self.collect()
            self.logger.info(f"{len(jobs)} offre(s) depuis {self.name}")
            return jobs

        except Exception as e:
            self.logger.error(f"Erreur scraping {self.name} : {e}")
            return []
`;

const HTML_SCRAPER = `"""
Scraper HTML generique avec BeautifulSoup.

Utilise httpx + BeautifulSoup pour extraire les offres
depuis une page HTML statique.
"""

import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from app.services.normalizer import clean_text, parse_date


# ==================== Configuration ====================
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_TIMEOUT = 20


class HTMLScraper:
    """
    Scraper HTML generique.

    Fournit des methodes utilitaires pour scraper
    une page et extraire les offres selon des selecteurs CSS.
    """

    def __init__(self):
        self.logger = None  # Defini par le scraper appelant

    @staticmethod
    def fetch(url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
        """
        Telecharge une page HTML.

        Returns:
            Contenu HTML en string
        """

        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        }

        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.text

    @staticmethod
    def parse(html: str) -> BeautifulSoup:
        """Parse le HTML avec BeautifulSoup."""
        return BeautifulSoup(html, "lxml")

    @staticmethod
    def select_items(soup, selector: str) -> list:
        """Selectionne les elements correspondant au selecteur CSS."""
        return soup.select(selector)

    @staticmethod
    def extract_text(element, selector: str | None = None) -> str | None:
        """Extrait le texte d'un element (ou d'un sous-element)."""

        if element is None:
            return None

        target = element.select_one(selector) if selector else element
        if target is None:
            return None

        return clean_text(target.get_text(strip=True))

    @staticmethod
    def extract_attr(element, selector: str, attr: str = "href") -> str | None:
        """Extrait un attribut d'un sous-element."""

        if element is None:
            return None

        target = element.select_one(selector)
        if target is None:
            return None

        return target.get(attr)

    @staticmethod
    def absolute_url(base_url: str, href: str | None) -> str | None:
        """Convertit une URL relative en URL absolue."""

        if not href:
            return None

        if href.startswith("http"):
            return href

        return urljoin(base_url, href)


def make_job(
    titre: str,
    url: str,
    source: str,
    entreprise: str | None = None,
    pays: str | None = None,
    ville: str | None = None,
    description: str | None = None,
    type_contrat: str | None = None,
    categorie: str | None = None,
    date_publication=None,
    teletravail: bool = False,
) -> dict:
    """
    Construit un dict d'offre normalise.

    Utilitaire partage par tous les scrapers.
    """

    return {
        "titre": titre,
        "entreprise": entreprise,
        "pays": pays,
        "ville": ville,
        "description": description,
        "type_contrat": type_contrat,
        "niveau": None,
        "categorie": categorie,
        "date_publication": parse_date(date_publication),
        "date_expiration": None,
        "url": url,
        "source": source,
        "teletravail": teletravail,
    }
`;

const PLAYWRIGHT_SCRAPER = `"""
Scraper HTML avec Playwright pour sites JavaScript (SPA).

⚠️ Necessite l'installation de Playwright :
    pip install playwright
    playwright install chromium

Utilisation :
    from app.collectors.scrapers.playwright_scraper import fetch_js
    html = fetch_js("https://exemple.com/jobs")
"""

from app.core.logger import get_logger


logger = get_logger(__name__)


def fetch_js(url: str, wait_selector: str | None = None, timeout: int = 30000) -> str:
    """
    Recupere le HTML d'une page apres execution du JavaScript.

    Args:
        url             : URL a scraper
        wait_selector   : Selecteur CSS a attendre avant de recuperer le HTML
        timeout         : Timeout en millisecondes

    Returns:
        HTML rendu (string)

    Raises:
        RuntimeError : Si Playwright n'est pas installe
    """

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RuntimeError(
            "Playwright non installe. Executez :\\n"
            "  pip install playwright\\n"
            "  playwright install chromium"
        )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        try:
            page = browser.new_page(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
                ),
            )

            page.goto(url, wait_until="networkidle", timeout=timeout)

            if wait_selector:
                page.wait_for_selector(wait_selector, timeout=timeout)

            html = page.content()

        finally:
            browser.close()

    return html
`;

const PDF_SCRAPER = `"""
Parser PDF pour offres au format PDF (concours, recrutements publics).

⚠️ Necessite l'installation de pdfplumber :
    pip install pdfplumber

Utilisation :
    from app.collectors.scrapers.pdf_scraper import extract_text
    text = extract_text("https://example.com/offre.pdf")
"""

import io

from app.core.logger import get_logger


logger = get_logger(__name__)


def extract_text(pdf_url_or_bytes) -> str:
    """
    Extrait le texte d'un PDF.

    Args:
        pdf_url_or_bytes : URL du PDF ou bytes du PDF

    Returns:
        Texte extrait

    Raises:
        RuntimeError : Si pdfplumber n'est pas installe
    """

    try:
        import pdfplumber
        import httpx
    except ImportError:
        raise RuntimeError(
            "pdfplumber non installe. Executez : pip install pdfplumber"
        )

    # Recupere les bytes si c'est une URL
    if isinstance(pdf_url_or_bytes, str):
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            response = client.get(pdf_url_or_bytes)
            response.raise_for_status()
            pdf_bytes = response.content
    else:
        pdf_bytes = pdf_url_or_bytes

    # Parse le PDF
    text_parts = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)

    return "\\n".join(text_parts)
`;

const SOURCES_INIT = `"""
Sources concretes de scraping HTML.

Chaque fichier contient un scraper pour un site specifique.
"""

from app.collectors.scrapers.sources.flutterwave import FlutterwaveScraper
from app.collectors.scrapers.sources.paystack import PaystackScraper
from app.collectors.scrapers.sources.kuda import KudaScraper
from app.collectors.scrapers.sources.cfao import CFAOScraper
from app.collectors.scrapers.sources.zonemploi import ZonemploiScraper
from app.collectors.scrapers.sources.maliweb import MaliwebScraper
from app.collectors.scrapers.sources.myjobmag import MyJobMagScraper
from app.collectors.scrapers.sources.benin_webtv import BeninWebTVScraper


ALL_SCRAPER_SOURCES = [
    FlutterwaveScraper,
    PaystackScraper,
    KudaScraper,
    CFAOScraper,
    ZonemploiScraper,
    MaliwebScraper,
    MyJobMagScraper,
    BeninWebTVScraper,
]


def get_scraper_sources_summary() -> list[dict]:
    """Retourne un resume des scrapers configures."""
    summary = []

    for ScraperClass in ALL_SCRAPER_SOURCES:
        try:
            scraper = ScraperClass()
            summary.append({
                "name": scraper.name,
                "base_url": getattr(scraper, "base_url", None),
                "country": getattr(scraper, "country", None),
                "type": "html",
                "status": "active",
            })
        except Exception as e:
            summary.append({
                "name": ScraperClass.__name__,
                "error": str(e),
                "status": "error",
            })

    return summary
`;

// ==================== Scrapers individuels ====================

const FLUTTERWAVE = `"""
Scraper Flutterwave - Fintech nigeriane.

Site : https://flutterwave.com/careers
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class FlutterwaveScraper(BaseScraper):
    """Flutterwave - Fintech paiements (Nigeria)."""

    name = "Flutterwave"
    base_url = "https://flutterwave.com"
    country = "Nigeria"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        """
        Scrape les offres de Flutterwave.

        Note : Flutterwave utilise une page /careers avec des liens
        vers un ATS interne. On scrape les liens visibles.
        """

        url = f"{self.base_url}/careers"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        # Recherche les liens d'offres (pattern commun : /careers/ ou job)
        jobs = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")

            if not any(k in href.lower() for k in ["job", "career", "position", "opening"]):
                continue

            titre = self.scraper.extract_text(link) or link.get_text(strip=True)
            if not titre or len(titre) < 3:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            # Evite les doublons
            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="Flutterwave",
                entreprise="Flutterwave",
                pays="Nigeria",
            ))

        return jobs
`;

const PAYSTACK = `"""
Scraper Paystack - Fintech nigeriane.

Site : https://paystack.com/careers
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class PaystackScraper(BaseScraper):
    """Paystack - Fintech paiements (Nigeria)."""

    name = "Paystack"
    base_url = "https://paystack.com"
    country = "Nigeria"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        url = f"{self.base_url}/careers"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")

            if not any(k in href.lower() for k in ["job", "career", "position", "role"]):
                continue

            titre = link.get_text(strip=True)
            if not titre or len(titre) < 3:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="Paystack",
                entreprise="Paystack",
                pays="Nigeria",
            ))

        return jobs
`;

const KUDA = `"""
Scraper Kuda - Neobanque nigeriane.

Site : https://kuda.com/careers
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class KudaScraper(BaseScraper):
    """Kuda - Neobanque digitale (Nigeria)."""

    name = "Kuda"
    base_url = "https://kuda.com"
    country = "Nigeria"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        url = f"{self.base_url}/careers"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")

            if not any(k in href.lower() for k in ["job", "career", "position"]):
                continue

            titre = link.get_text(strip=True)
            if not titre or len(titre) < 3:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="Kuda",
                entreprise="Kuda",
                pays="Nigeria",
            ))

        return jobs
`;

const CFAO = `"""
Scraper CFAO Careers - Multi-pays Afrique de l'Ouest.

Site : https://www.cfao.com/careers
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class CFAOScraper(BaseScraper):
    """CFAO Careers - Emplois multi-pays (Afrique)."""

    name = "CFAO Careers"
    base_url = "https://www.cfao.com"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        url = f"{self.base_url}/careers"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")

            if not any(k in href.lower() for k in ["job", "career", "position", "offre"]):
                continue

            titre = link.get_text(strip=True)
            if not titre or len(titre) < 3:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="CFAO Careers",
                entreprise="CFAO",
            ))

        return jobs
`;

const ZONEMPLOI = `"""
Scraper Zonemploi - Offres du Niger.

Site : https://www.zonemploi.com
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class ZonemploiScraper(BaseScraper):
    """Zonemploi - Offres du Niger."""

    name = "Zonemploi"
    base_url = "https://www.zonemploi.com"
    country = "Niger"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        try:
            html = self.scraper.fetch(self.base_url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {self.base_url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")

            if not any(k in href.lower() for k in ["emploi", "offre", "job", "stage"]):
                continue

            titre = link.get_text(strip=True)
            if not titre or len(titre) < 5:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="Zonemploi",
                pays="Niger",
            ))

        return jobs
`;

const MALIWEB = `"""
Scraper Maliweb - Emploi/APEJ au Mali.

Site : https://www.maliweb.net/category/emploi
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class MaliwebScraper(BaseScraper):
    """Maliweb - Emploi/APEJ (Mali)."""

    name = "Maliweb"
    base_url = "https://www.maliweb.net"
    country = "Mali"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        url = f"{self.base_url}/category/emploi"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for article in soup.select("article, .post, .entry"):
            titre_el = article.select_one("h2 a, h3 a, .entry-title a")
            if not titre_el:
                continue

            titre = titre_el.get_text(strip=True)
            href = titre_el.get("href")

            if not titre or not href:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="Maliweb",
                pays="Mali",
            ))

        return jobs
`;

const MYJOBMAG = `"""
Scraper MyJobMag - Job board nigerian.

Site : https://www.myjobmag.com
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class MyJobMagScraper(BaseScraper):
    """MyJobMag - Job board (Nigeria)."""

    name = "MyJobMag"
    base_url = "https://www.myjobmag.com"
    country = "Nigeria"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        try:
            html = self.scraper.fetch(self.base_url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {self.base_url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        # MyJobMag utilise des <li class="job-list-li"> avec <h2><a>
        for item in soup.select("li.job-list-li, .job-list-li, article"):
            titre_el = item.select_one("h2 a, h3 a, a.job-title")
            if not titre_el:
                continue

            titre = titre_el.get_text(strip=True)
            href = titre_el.get("href")

            if not titre or not href:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="MyJobMag",
                pays="Nigeria",
            ))

        return jobs
`;

const BENIN_WEBTV = `"""
Scraper Benin Web TV - Offres d'emploi au Benin.

Site : https://beninwebtv.bj/emploi-benin/
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class BeninWebTVScraper(BaseScraper):
    """Benin Web TV - Actualites et opportunites (Benin)."""

    name = "Benin Web TV"
    base_url = "https://beninwebtv.bj"
    country = "Benin"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        url = f"{self.base_url}/emploi-benin/"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for article in soup.select("article, .post, .entry"):
            titre_el = article.select_one("h2 a, h3 a, .entry-title a")
            if not titre_el:
                continue

            titre = titre_el.get_text(strip=True)
            href = titre_el.get("href")

            if not titre or not href:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="Benin Web TV",
                pays="Benin",
            ))

        return jobs
`;

const COLLECT_SCRAPERS_API = `"""
Routes API pour la collecte par scraping HTML.

Separe de collect.py et collect_ats.py pour rester isole.
"""

from fastapi import APIRouter

from app.core.logger import get_logger
from app.collectors.scrapers.sources import (
    ALL_SCRAPER_SOURCES,
    get_scraper_sources_summary,
)
from app.services.job_service import bulk_create_jobs


logger = get_logger(__name__)

router = APIRouter(prefix="/collect/scrapers", tags=["collect-scrapers"])


@router.get("/sources", summary="Liste des sources scrapers")
def list_scraper_sources():
    """Retourne la liste des sites configures pour le scraping."""
    return get_scraper_sources_summary()


@router.post("/run", summary="Lancer une collecte par scraping")
def collect_scrapers():
    """
    Lance tous les scrapers HTML et insere les offres en base.

    Separe de POST /collect/ats/run et POST /admin/scheduler/trigger.
    """

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    for ScraperClass in ALL_SCRAPER_SOURCES:
        scraper = ScraperClass()

        try:
            jobs = scraper.collect()
            collected = len(jobs)

            if collected == 0:
                details.append({
                    "source": scraper.name,
                    "status": "empty",
                    "collected": 0,
                })
                continue

            result = bulk_create_jobs(jobs)

            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted
            total_skipped += skipped

            details.append({
                "source": scraper.name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
            })

            logger.info(
                f"Scraper {scraper.name} : "
                f"{collected} collectees, {inserted} inserees"
            )

        except Exception as e:
            total_errors += 1
            details.append({
                "source": scraper.name,
                "status": "error",
                "error": str(e)[:200],
            })
            logger.error(f"Scraper {scraper.name} : {e}")

    return {
        "message": "Collecte scrapers terminee",
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "details": details,
    }
`;

const FILES = {
  "backend/app/collectors/scrapers/__init__.py": SCRAPERS_INIT,
  "backend/app/collectors/scrapers/base_scraper.py": BASE_SCRAPER,
  "backend/app/collectors/scrapers/html_scraper.py": HTML_SCRAPER,
  "backend/app/collectors/scrapers/playwright_scraper.py": PLAYWRIGHT_SCRAPER,
  "backend/app/collectors/scrapers/pdf_scraper.py": PDF_SCRAPER,
  "backend/app/collectors/scrapers/sources/__init__.py": SOURCES_INIT,
  "backend/app/collectors/scrapers/sources/flutterwave.py": FLUTTERWAVE,
  "backend/app/collectors/scrapers/sources/paystack.py": PAYSTACK,
  "backend/app/collectors/scrapers/sources/kuda.py": KUDA,
  "backend/app/collectors/scrapers/sources/cfao.py": CFAO,
  "backend/app/collectors/scrapers/sources/zonemploi.py": ZONEMPLOI,
  "backend/app/collectors/scrapers/sources/maliweb.py": MALIWEB,
  "backend/app/collectors/scrapers/sources/myjobmag.py": MYJOBMAG,
  "backend/app/collectors/scrapers/sources/benin_webtv.py": BENIN_WEBTV,
  "backend/app/api/collect_scrapers.py": COLLECT_SCRAPERS_API,
};

// ==================== Patch de main.py ====================

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${mainPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("collect_scrapers")) {
    log.info("main.py deja patche (collect_scrapers present)");
    return true;
  }

  // Backup
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "main.py"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  let modified = false;

  // Patch import
  const importPatterns = [
    "from app.api import jobs, stats, collect, admin, collect_ats",
    "from app.api import jobs, stats, collect, admin",
    "from app.api import jobs, stats, collect",
    "from app.api import jobs, stats",
  ];

  for (const pattern of importPatterns) {
    if (content.includes(pattern)) {
      content = content.replace(
        pattern,
        pattern + ", collect_scrapers"
      );
      modified = true;
      break;
    }
  }

  // Patch include_router
  const includePatterns = [
    "app.include_router(collect_ats.router)",
    "app.include_router(admin.router)",
    "app.include_router(collect.router)",
    "app.include_router(stats.router)",
  ];

  for (const pattern of includePatterns) {
    if (content.includes(pattern)) {
      content = content.replace(
        pattern,
        pattern + "\napp.include_router(collect_scrapers.router)"
      );
      modified = true;
      break;
    }
  }

  if (modified && !OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
    log.file(mainPath + " (patché)", "overwritten");
  }

  return modified;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 04 — SCRAPER HTML");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    console.log("");
    log.info("Installez d'abord les modules 00, 01, 02 :");
    console.log("    node 00-architecture.js");
    console.log("    node 01-backend-base.js");
    console.log("    node 02-collectors.js");
    console.log("");
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller, ou --uninstall pour supprimer.");
    process.exit(0);
  }

  // Désinstallation
  if (OPTIONS.uninstall) {
    log.section("Desinstallation");

    for (const file of Object.keys(FILES)) {
      if (exists(file)) {
        if (!OPTIONS.dryRun) removeFile(file);
        log.file(file, "removed");
      }
    }

    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);

    log.banner("MODULE 04 — DESINSTALLE");
    return;
  }

  // Création des fichiers
  log.section(`Creation de ${Object.keys(FILES).length} fichiers`);

  const results = writeFiles(FILES, {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    `-> ${results.created} cree(s), ${results.overwritten} ecrase(s), ${results.skipped} ignore(s)`
  );

  // Patch main.py
  log.section("Patch de main.py");
  patchMainPy();

  // Enregistrement
  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 04 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  OPTIONNEL — Installer Playwright (sites JS) :");
  console.log("    pip install playwright");
  console.log("    playwright install chromium");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Uvicorn redemarre automatiquement");
  console.log("  2. Tester : GET /collect/scrapers/sources");
  console.log("  3. Lancer : POST /collect/scrapers/run");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});