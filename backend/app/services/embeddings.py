"""
Embeddings semantiques multilingues.

Utilise IBM Granite 97M (100+ langues).
Utile pour :
    - Deduplication avancée
    - Matching candidat <-> offre
    - Recherche semantique
"""

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.ai_config import EMBEDDINGS_MODEL
from app.core.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _load_model():
    """Charge le modele d'embeddings une seule fois."""

    logger.info(f"Chargement des embeddings : {EMBEDDINGS_MODEL}")
    return SentenceTransformer(EMBEDDINGS_MODEL)


def encode(texts: list[str] | str):
    """
    Encode une liste de textes en vecteurs.
    """

    if isinstance(texts, str):
        texts = [texts]

    model = _load_model()

    return model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=32,
        show_progress_bar=False,
    )


def similarity(text1: str, text2: str) -> float:
    """Similarite cosinus entre deux textes."""

    embeddings = encode([text1, text2])
    return float(embeddings[0] @ embeddings[1])


def semantic_search(query: str, documents: list[str], top_k: int = 5):
    """Recherche semantique."""

    if not documents:
        return []

    all_texts = [query] + documents
    embeddings = encode(all_texts)

    query_emb = embeddings[0]
    doc_embs = embeddings[1:]

    scores = doc_embs @ query_emb
    indices = scores.argsort()[::-1][:top_k]

    return [{"index": int(i), "score": float(scores[i]), "text": documents[i]} for i in indices]
