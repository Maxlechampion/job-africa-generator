"""
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
            "Playwright non installe. Executez :\n"
            "  pip install playwright\n"
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
