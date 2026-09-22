"""
Detection de la langue d'un texte.

Utilise XLM-RoBERTa (20 langues, très fiable pour FR/EN).
"""

from functools import lru_cache

from transformers import pipeline

from app.core.logger import get_logger
from app.core.ai_config import LANGUAGE_MODEL


logger = get_logger(__name__)


# Mapping des codes du modèle vers des noms lisibles
LANG_MAP = {
    "fr": "français",
    "en": "anglais",
    "ar": "arabe",
    "es": "espagnol",
    "pt": "portugais",
    "it": "italien",
    "de": "allemand",
    "nl": "néerlandais",
    "ru": "russe",
    "zh": "chinois",
    "ja": "japonais",
    "tr": "turc",
    "sw": "swahili",
    "hi": "hindi",
    "ur": "ourdou",
    "bg": "bulgare",
    "el": "grec",
    "th": "thaï",
    "vi": "vietnamien",
    "pl": "polonais",
}


@lru_cache(maxsize=1)
def _load_model():
    """Charge le modele une seule fois."""

    logger.info(f"Chargement du detecteur de langue : {LANGUAGE_MODEL}")

    return pipeline(
        "text-classification",
        model=LANGUAGE_MODEL,
        device=-1,
        top_k=1,
    )


def detect_language(text: str) -> dict:
    """
    Detecte la langue d'un texte.

    Returns:
        {"langue": "français", "code": "fr", "confiance": 0.95}
    """

    if not text or len(text.strip()) < 20:
        return {"langue": "inconnue", "code": "unknown", "confiance": 0.0}

    try:
        model = _load_model()
        result = model(text[:1000])[0]

        # result : [{"label": "fr", "score": 0.95}]
        if isinstance(result, list):
            result = result[0]

        code = result["label"]
        score = result["score"]

        return {
            "langue": LANG_MAP.get(code, code),
            "code": code,
            "confiance": round(score, 3),
        }

    except Exception as e:
        logger.error(f"Erreur detection langue : {e}")
        return {"langue": "inconnue", "code": "unknown", "confiance": 0.0}