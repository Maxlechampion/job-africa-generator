"""
Tests du service de normalisation.
"""

from app.services.normalizer import (
    clean_text,
    detect_pays,
    job_fingerprint,
    normalize_job,
    normalize_url,
    parse_date,
)


# ==================== clean_text ====================
def test_clean_text_espaces():
    assert clean_text("  Hello   World  ") == "Hello World"


def test_clean_text_html():
    assert clean_text("<p>Bonjour</p>") == "Bonjour"


def test_clean_text_none():
    assert clean_text(None) is None


def test_clean_text_vide():
    assert clean_text("") is None


# ==================== detect_pays ====================
def test_detect_pays_benin():
    assert detect_pays("Offre au Bénin") == "Bénin"


def test_detect_pays_senegal():
    assert detect_pays("Poste au Sénégal") == "Sénégal"


def test_detect_pays_aucun():
    assert detect_pays("Aucun pays mentionné") is None


# ==================== normalize_url ====================
def test_normalize_url_tracking():
    url = normalize_url("https://Example.com/job/?utm_source=x&fbclid=y")
    assert url == "https://example.com/job"


def test_normalize_url_fragment():
    url = normalize_url("https://example.com/job#section")
    assert url == "https://example.com/job"


# ==================== parse_date ====================
def test_parse_date_iso():
    assert parse_date("2026-09-15") is not None


def test_parse_date_fr():
    assert parse_date("15/09/2026") is not None


def test_parse_date_none():
    assert parse_date(None) is None


# ==================== normalize_job ====================
def test_normalize_job():
    job = {
        "titre": "  Développeur   Python ",
        "url": "https://example.com/job",
        "source": "Test",
    }

    result = normalize_job(job)

    assert result["titre"] == "Développeur Python"
    assert result["source"] == "Test"
    assert result["url"] == "https://example.com/job"


def test_normalize_job_detecte_pays():
    job = {
        "titre": "Développeur",
        "description": "Poste basé au Bénin",
        "url": "https://example.com/job",
        "source": "Test",
    }

    result = normalize_job(job)

    assert result["pays"] == "Bénin"


# ==================== job_fingerprint ====================
def test_job_fingerprint():
    job = {
        "titre": "Développeur Python",
        "entreprise": "ABC Corp",
        "ville": "Cotonou",
    }

    fp = job_fingerprint(job)

    assert "developpeur-python" in fp
    assert "abc-corp" in fp
    assert "cotonou" in fp
