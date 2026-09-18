"""
Collecteurs d'offres d'emploi.

Ce package contient :
    - base.py              → Classe abstraite BaseCollector
    - rss_collector.py     → Collecteur RSS générique
    - scraper.py           → Scraper HTML générique
    - sources/             → Sources concrètes (une par fichier)

Pour ajouter une nouvelle source :
    1. Créer un fichier dans sources/
    2. Hériter de RSSCollector ou HTMLScraper
    3. Ajouter la classe dans backend/app/api/collect.py
"""
