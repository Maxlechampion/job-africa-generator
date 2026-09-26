"""
Flux RSS Benin News — Carrière au Bénin.
"""

from app.collectors.rss_collector import RSSCollector


class BeninNewsRSS(RSSCollector):
    """Benin News — Carrière (tag officiel)."""

    def __init__(self):
        super().__init__(
            feed_url="https://benin-news.bj/tag/carriere/feed/",
            source_name="Benin News",
            country="Benin",
        )