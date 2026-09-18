"""
Tests des endpoints API.
"""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_home():
    """Test de l'endpoint racine."""
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "online"
    assert "version" in data
    assert "message" in data


def test_health():
    """Test de l'endpoint healthcheck."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_countries():
    """Test de l'endpoint countries."""
    response = client.get("/countries")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_categories():
    """Test de l'endpoint categories."""
    response = client.get("/categories")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_sources():
    """Test de l'endpoint sources."""
    response = client.get("/sources")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_stats():
    """Test de l'endpoint stats."""
    response = client.get("/stats")

    assert response.status_code == 200
    assert "total_offres" in response.json()


def test_jobs_list():
    """Test de la liste des offres."""
    response = client.get("/jobs")

    assert response.status_code == 200

    data = response.json()
    assert "total" in data
    assert "results" in data
    assert "limit" in data
    assert "offset" in data
