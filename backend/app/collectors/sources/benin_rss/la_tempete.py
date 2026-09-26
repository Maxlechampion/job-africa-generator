"""
Flux RSS La Tempête Bénin — Offres d'emploi.

⚠️ Ce flux publie AUSSI des articles d'actualité.
Le filtre v3 doit rejeter les articles non-offres.
"""

from app.collectors.rss_collector import RSSCollector


class LaTempeteBeninRSS(RSSCollector):
    """La Tempête Bénin — Offres d'emploi (tag dédié)."""

    def __init__(self):
        super().__init__(
            feed_url="https://quotidienlatempete.bj/tag/actu-offre-demploi/feed/",
            source_name="La Tempête Bénin",
            country="Benin",
        )
