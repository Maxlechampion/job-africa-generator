"""
Sources RSS du Bénin.
"""

from app.collectors.sources.benin_rss.la_tempete import LaTempeteBeninRSS
from app.collectors.sources.benin_rss.benin_news import BeninNewsRSS


ALL_BENIN_RSS_SOURCES = [
    LaTempeteBeninRSS,
    BeninNewsRSS,
]
