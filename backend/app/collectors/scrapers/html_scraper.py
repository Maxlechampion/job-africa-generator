"""
Scraper HTML generique avec BeautifulSoup + cascade de fallback.

Cascade de methodes (dans l'ordre) :
    1. curl_cffi       → usurpation TLS (Chrome 120)
    2. cloudscraper    → résolution challenges Cloudflare
    3. httpx           → HTTP standard
    4. playwright      → navigateur headless (contourne JS challenges)
    5. Cloudflare Proxy → fallback ultime si 403 persiste

Le proxy Cloudflare Worker est configuré via la variable d'environnement
CLOUDFLARE_PROXY_URL. Si elle est définie et qu'un 403 survient, la
requête est relancée à travers le Worker.

Utilisation :
    scraper = HTMLScraper()
    html = scraper.fetch("https://example.com/jobs")
"""

import os
import time
import urllib.parse
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.services.normalizer import clean_text, parse_date


# ==================== Configuration ====================
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_TIMEOUT = 20
DEFAULT_IMPERSONATE = "chrome120"

# Proxy Cloudflare Worker (optionnel)
CLOUDFLARE_PROXY_URL = os.getenv("CLOUDFLARE_PROXY_URL", "").strip()


# ==================== Détection des dépendances ====================

# 1. curl_cffi (usurpation TLS)
try:
    from curl_cffi import requests as curl_requests
    CURL_CFFI_AVAILABLE = True
except ImportError:
    curl_requests = None
    CURL_CFFI_AVAILABLE = False

# 2. cloudscraper (Cloudflare)
try:
    import cloudscraper
    CLOUDSCRAPER_AVAILABLE = True
except ImportError:
    cloudscraper = None
    CLOUDSCRAPER_AVAILABLE = False

# 3. httpx (standard)
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    httpx = None
    HTTPX_AVAILABLE = False

# 4. playwright (navigateur headless)
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    sync_playwright = None
    PLAYWRIGHT_AVAILABLE = False


class HTMLScraper:
    """
    Scraper HTML avec cascade de fallback automatique.

    Si un 403 est détecté et que CLOUDFLARE_PROXY_URL est configuré,
    la requête est relancée via le proxy Cloudflare Worker.
    """

    def __init__(self, impersonate: str = DEFAULT_IMPERSONATE):
        """
        Args:
            impersonate: Version de navigateur a imiter (curl_cffi)
                         Valeurs : "chrome120", "chrome110", "chrome99",
                                   "firefox135", "safari17_0", etc.
        """
        self.impersonate = impersonate

    # ================================================================
    # METHODE PRINCIPALE — Cascade automatique
    # ================================================================

    def fetch(
        self,
        url: str,
        timeout: int = DEFAULT_TIMEOUT,
        max_attempts: int = 4,
    ) -> str:
        """
        Telecharge une page HTML en essayant successivement les methodes.

        Si toutes les méthodes directes échouent avec 403 et qu'un proxy
        Cloudflare est configuré, retente via le proxy.

        Args:
            url          : URL a telecharger
            timeout      : Timeout par tentative (secondes)
            max_attempts : Nombre max de methodes a essayer (defaut : 4)

        Returns:
            Contenu HTML

        Raises:
            RuntimeError : Si toutes les methodes echouent
        """

        methods = [
            ("curl_cffi", self.fetch_curl_cffi, CURL_CFFI_AVAILABLE),
            ("cloudscraper", self.fetch_cloudscraper, CLOUDSCRAPER_AVAILABLE),
            ("httpx", self.fetch_httpx, HTTPX_AVAILABLE),
            ("playwright", self.fetch_playwright, PLAYWRIGHT_AVAILABLE),
        ]

        attempts = 0
        errors = []
        has_403 = False

        for name, method, available in methods:
            if not available:
                continue

            if attempts >= max_attempts:
                break

            attempts += 1

            try:
                html = method(url, timeout)

                # Verifie que le HTML est valide (pas vide, pas un challenge)
                if html and len(html) > 1000:
                    if attempts > 1:
                        print(f"[HTMLScraper] OK avec {name} (apres {attempts} tentatives)")
                    return html
                else:
                    errors.append(f"{name}: contenu trop court ({len(html) if html else 0} car.)")

            except Exception as e:
                error_str = str(e)
                errors.append(f"{name}: {error_str[:100]}")

                # Détecte un 403
                if "403" in error_str or "Forbidden" in error_str:
                    has_403 = True

                continue

        # ============================================================
        # FALLBACK PROXY CLOUDFLARE
        # ============================================================
        if has_403 and CLOUDFLARE_PROXY_URL:
            print(f"[HTMLScraper] 403 persistant, tentative via proxy Cloudflare")

            try:
                proxy_url = self._build_proxy_url(url)
                html = self._fetch_proxy(proxy_url, timeout)

                if html and len(html) > 1000:
                    print(f"[HTMLScraper] OK via proxy Cloudflare")
                    return html
                else:
                    errors.append(f"proxy: contenu trop court ({len(html) if html else 0} car.)")

            except Exception as e:
                errors.append(f"proxy: {str(e)[:100]}")

        # Toutes les methodes ont echoue
        error_msg = " | ".join(errors) if errors else "Aucune methode disponible"
        raise RuntimeError(f"Echec de fetch pour {url} : {error_msg}")

    # ================================================================
    # PROXY CLOUDFLARE
    # ================================================================

    def _build_proxy_url(self, target_url: str) -> str:
        """Construit l'URL proxy Cloudflare."""

        # Encode l'URL cible pour la passer en paramètre
        encoded = urllib.parse.quote(target_url, safe="")
        return f"{CLOUDFLARE_PROXY_URL}?url={encoded}"

    def _fetch_proxy(self, proxy_url: str, timeout: int) -> str:
        """Requête via le proxy Cloudflare."""

        if HTTPX_AVAILABLE:
            with httpx.Client(
                timeout=timeout,
                follow_redirects=True,
                headers={"User-Agent": USER_AGENT},
            ) as client:
                response = client.get(proxy_url)
                response.raise_for_status()
                return response.text

        elif CURL_CFFI_AVAILABLE:
            response = curl_requests.get(
                proxy_url,
                timeout=timeout,
                impersonate=self.impersonate,
                allow_redirects=True,
            )
            response.raise_for_status()
            return response.text

        else:
            raise RuntimeError("Aucune lib HTTP disponible pour le proxy")

    # ================================================================
    # METHODE 1 — curl_cffi (usurpation TLS)
    # ================================================================

    def fetch_curl_cffi(self, url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
        """
        Telecharge avec curl_cffi (usurpation empreinte TLS Chrome).

        Efficace contre :
            - TLS fingerprinting
            - Cloudflare (partiel)
            - Sites bloquant les User-Agents generiques
        """

        if not CURL_CFFI_AVAILABLE:
            raise RuntimeError("curl_cffi non installe (pip install curl_cffi)")

        headers = {
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;"
                "q=0.9,image/avif,image/webp,*/*;q=0.8"
            ),
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        }

        response = curl_requests.get(
            url,
            headers=headers,
            timeout=timeout,
            impersonate=self.impersonate,
            allow_redirects=True,
        )
        response.raise_for_status()
        return response.text

    # ================================================================
    # METHODE 2 — cloudscraper (Cloudflare)
    # ================================================================

    def fetch_cloudscraper(self, url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
        """
        Telecharge avec cloudscraper (resolution challenges Cloudflare).

        Efficace contre :
            - Cloudflare IUAM (I'm Under Attack Mode)
            - Cloudflare Turnstile (partiel)
            - Challenges JavaScript basiques
        """

        if not CLOUDSCRAPER_AVAILABLE:
            raise RuntimeError("cloudscraper non installe (pip install cloudscraper)")

        scraper = cloudscraper.create_scraper(
            browser={
                "browser": "chrome",
                "platform": "windows",
                "mobile": False,
                "desktop": True,
            }
        )

        response = scraper.get(url, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
        return response.text

    # ================================================================
    # METHODE 3 — httpx (standard)
    # ================================================================

    def fetch_httpx(self, url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
        """
        Telecharge avec httpx (HTTP standard).

        Fonctionne pour les sites sans anti-bot (comme Benin Digital).

        Non efficace contre :
            - TLS fingerprinting
            - Cloudflare
            - Anti-bot avances
        """

        if not HTTPX_AVAILABLE:
            raise RuntimeError("httpx non installe")

        headers = {
            "User-Agent": USER_AGENT,
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;"
                "q=0.9,image/avif,image/webp,*/*;q=0.8"
            ),
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }

        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.text

    # ================================================================
    # METHODE 4 — playwright (navigateur headless)
    # ================================================================

    def fetch_playwright(
        self,
        url: str,
        timeout: int = 30000,
        wait_selector: str | None = None,
    ) -> str:
        """
        Telecharge avec Playwright (navigateur Chromium headless).

        Efficace contre :
            - Sites 100% JavaScript (SPA, React, Vue)
            - Challenges complexes (Turnstile, hCaptcha JS)
            - Sites qui detectent les bots par comportement

        Le plus lent (~3-5s par page) mais le plus puissant.

        Args:
            url           : URL a scraper
            timeout       : Timeout en millisecondes
            wait_selector : Selecteur CSS a attendre avant de recuperer le HTML
        """

        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError(
                "playwright non installe.\n"
                "Executez : pip install playwright && playwright install chromium"
            )

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )

            try:
                context = browser.new_context(
                    user_agent=USER_AGENT,
                    viewport={"width": 1920, "height": 1080},
                    locale="fr-FR",
                    timezone_id="Africa/Porto-Novo",
                    extra_http_headers={
                        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
                    },
                )

                page = context.new_page()

                # Masque les indicateurs de bot
                page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                """)

                # Navigue et attend le reseau calme
                page.goto(url, wait_until="domcontentloaded", timeout=timeout)

                # Attend un peu pour laisser le JS s'executer
                page.wait_for_timeout(2000)

                # Attend le selecteur si fourni
                if wait_selector:
                    try:
                        page.wait_for_selector(wait_selector, timeout=timeout)
                    except Exception:
                        pass

                # Recupere le HTML
                html = page.content()

            finally:
                browser.close()

        return html

    # ================================================================
    # UTILITAIRES (parsing)
    # ================================================================

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


# ================================================================
# FONCTION UTILITAIRE : make_job
# ================================================================

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