"""
Extraction de competences via GLiNER.

GLiNER permet l'extraction zero-shot avec des labels libres.
Multilingue (FR, EN, DE, IT, ES).
"""

from functools import lru_cache

from gliner import GLiNER

from app.core.logger import get_logger
from app.core.ai_config import NER_MODEL, MAX_TEXT_LENGTH, SKILL_LABELS


logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _load_model():
    """Charge le modele GLiNER une seule fois."""

    logger.info(f"Chargement du NER : {NER_MODEL}")
    return GLiNER.from_pretrained(NER_MODEL)


def extract_skills(text: str, threshold: float = 0.5) -> dict:
    """
    Extrait les competences d'une offre.

    Args:
        text        : Texte de l'offre
        threshold   : Seuil de confiance (0-1)

    Returns:
        Dict {label: [valeurs]}
    """

    if not text or len(text.strip()) < 20:
        return {}

    try:
        model = _load_model()
        text = text[:MAX_TEXT_LENGTH]

        entities = model.predict_entities(
            text,
            SKILL_LABELS,
            threshold=threshold,
        )

        result: dict[str, list[str]] = {}

        for ent in entities:
            label = ent["label"]
            value = ent["text"].strip()

            if len(value) < 2 or len(value) > 60:
                continue

            result.setdefault(label, [])

            if value not in result[label]:
                result[label].append(value)

        return result

    except Exception as e:
        logger.error(f"Erreur extraction competences : {e}")
        return {}


def flatten_skills(skills: dict, text: str = None) -> list[str]:
    """
    Aplatit un dict de competences en liste unique.
    Filtre les faux positifs si le texte est fourni.
    """

    seen = set()
    flat = []

    for values in skills.values():
        for v in values:
            key = v.lower()
            if key not in seen:
                seen.add(key)
                flat.append(v)

    if text:
        flat = filter_skills(flat, text)

    return flat

# ==================== Filtre des faux positifs ====================

FALSE_POSITIVES = {
    "go", "rust", "word", "types", "react", "swift", "flutter",
    "the", "a", "an", "is", "to", "of", "in", "and", "or",
    "excel", "powerpoint", "outlook", "teams",
}

REQUIRES_CONTEXT = {
    "go": ["golang", "go developer", "go language", "go engineer", "google go"],
    "rust": ["rust developer", "rust engineer", "rust language", "rust-lang"],
    "react": ["react.js", "reactjs", "react developer", "react native"],
    "swift": ["swift developer", "swiftui", "ios swift"],
    "word": ["microsoft word", "ms word", "word document"],
}


def filter_skills(skills: list[str], text: str) -> list[str]:
    """
    Filtre les faux positifs.

    Une competence comme "Go" n'est gardee QUE si le texte
    contient "golang" ou "go developer".
    """

    text_lower = text.lower()
    filtered = []

    for skill in skills:
        skill_lower = skill.lower().strip()

        if skill_lower in FALSE_POSITIVES:
            if skill_lower in REQUIRES_CONTEXT:
                contexts = REQUIRES_CONTEXT[skill_lower]
                if any(ctx in text_lower for ctx in contexts):
                    filtered.append(skill)
            continue

        filtered.append(skill)

    return filtered
