"""
Parser PDF pour offres au format PDF (concours, recrutements publics).

⚠️ Necessite l'installation de pdfplumber :
    pip install pdfplumber

Utilisation :
    from app.collectors.scrapers.pdf_scraper import extract_text
    text = extract_text("https://example.com/offre.pdf")
"""

import io

from app.core.logger import get_logger

logger = get_logger(__name__)


def extract_text(pdf_url_or_bytes) -> str:
    """
    Extrait le texte d'un PDF.

    Args:
        pdf_url_or_bytes : URL du PDF ou bytes du PDF

    Returns:
        Texte extrait

    Raises:
        RuntimeError : Si pdfplumber n'est pas installe
    """

    try:
        import httpx
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber non installe. Executez : pip install pdfplumber")

    # Recupere les bytes si c'est une URL
    if isinstance(pdf_url_or_bytes, str):
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            response = client.get(pdf_url_or_bytes)
            response.raise_for_status()
            pdf_bytes = response.content
    else:
        pdf_bytes = pdf_url_or_bytes

    # Parse le PDF
    text_parts = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)

    return "\n".join(text_parts)
