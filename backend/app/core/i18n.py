"""
Traductions cote serveur (emails, erreurs API).

Support : fr (defaut), en.
"""

from typing import Literal

Lang = Literal["fr", "en"]


TRANSLATIONS: dict[str, dict[Lang, str]] = {
    # Emails
    "email_alert_subject": {
        "fr": "🔔 {count} nouvelle(s) offre(s) — {alert_name}",
        "en": "🔔 {count} new offer(s) — {alert_name}",
    },
    "email_alert_title": {
        "fr": "{count} nouvelle(s) offre(s) pour votre alerte",
        "en": "{count} new offer(s) for your alert",
    },
    "email_welcome_title": {
        "fr": "Bienvenue sur Job Africa, {name} 👋",
        "en": "Welcome to Job Africa, {name} 👋",
    },
    "email_cta_view_all": {
        "fr": "Voir toutes les offres",
        "en": "View all offers",
    },
    "email_footer_reason": {
        "fr": "Vous recevez cet email car vous avez configure une alerte sur Job Africa.",
        "en": "You are receiving this email because you set up an alert on Job Africa.",
    },
    "email_footer_manage": {
        "fr": "Gerer mes alertes",
        "en": "Manage my alerts",
    },
    # Erreurs API
    "error_not_found": {
        "fr": "Ressource introuvable",
        "en": "Resource not found",
    },
    "error_unauthorized": {
        "fr": "Authentification requise",
        "en": "Authentication required",
    },
    "error_forbidden": {
        "fr": "Acces refuse",
        "en": "Access denied",
    },
    "error_validation": {
        "fr": "Donnees invalides",
        "en": "Invalid data",
    },
}


def get_lang(accept_language: str | None) -> Lang:
    """Detecte la langue depuis l'en-tete Accept-Language."""

    if not accept_language:
        return "fr"

    lang = accept_language.lower().split(",")[0].split("-")[0].strip()

    return "en" if lang == "en" else "fr"


def t(key: str, lang: Lang = "fr", **kwargs) -> str:
    """Traduit une cle dans la langue donnee."""

    entry = TRANSLATIONS.get(key)
    if not entry:
        return key

    text = entry.get(lang) or entry.get("fr", key)

    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError):
            return text

    return text
