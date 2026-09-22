"""
Configuration des modeles IA (Hugging Face).

Tous les modeles sont gratuits et open source.
Certains tournent sur CPU, d'autres sont quantifies 4-bit.
"""

import os


# ==================== Cache local ====================
HF_HOME = os.path.join(os.getcwd(), ".hf_cache")
os.environ.setdefault("HF_HOME", HF_HOME)


# ==================== Modeles ====================

# Resumeur francais (Gemma 2b quantifie 4-bit)
SUMMARIZER_MODEL = "csebuetnlp/mT5_multilingual_XLSum"

# Extracteur de competences (GLiNER multilingue)
NER_MODEL = "urchade/gliner_multi-v2.1"


# Detecteur de langue (20 langues, très fiable)
LANGUAGE_MODEL = "papluca/xlm-roberta-base-language-detection"
# Embeddings multilingues (97M params)
EMBEDDINGS_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


# ==================== Parametres ====================

# Longueur max du texte a analyser
MAX_TEXT_LENGTH = 2000

# Longueur max du resume genere
MAX_SUMMARY_LENGTH = 150

# Seuil de similarite pour la dedup semantique
DEDUP_THRESHOLD = 0.92

# Labels de competences pour GLiNER
SKILL_LABELS = [
    "programming language",
    "software framework",
    "database system",
    "cloud platform",
    "devops tool",
    "data science library",
]