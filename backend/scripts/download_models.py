"""
Telecharge tous les modeles IA en local.

Usage :
    python -m scripts.download_models

⚠️ Le premier lancement prend 10-30 minutes (3 GB).
"""

import os
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer
from gliner import GLiNER


# Cache local
os.environ["HF_HOME"] = os.path.join(os.getcwd(), ".hf_cache")


MODELS = {
    "summarizer": "csebuetnlp/mT5_multilingual_XLSum",
    "gliner": "urchade/gliner_multi-v2.1",
    "language_id": "papluca/xlm-roberta-base-language-detection",
    "embeddings": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    }


def download_all():
    print("Telechargement des modeles IA...")
    print()

    print("1/4 - Resumeur francais...")
    AutoTokenizer.from_pretrained(MODELS["summarizer"])
    AutoModelForSeq2SeqLM.from_pretrained(MODELS["summarizer"])
    print("   OK")
    print()

    print("2/4 - Extracteur de competences (GLiNER)...")
    GLiNER.from_pretrained(MODELS["gliner"])
    print("   OK")
    print()

    print("3/4 - Detecteur de langues africaines...")
    AutoTokenizer.from_pretrained(MODELS["language_id"])
    print("   OK")
    print()

    print("4/4 - Embeddings multilingues...")
    SentenceTransformer(MODELS["embeddings"])
    print("   OK")
    print()

    print("Tous les modeles sont prets !")


if __name__ == "__main__":
    download_all()
