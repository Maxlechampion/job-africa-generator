# ==================== Image de base ====================
FROM python:3.12-slim

# ==================== Métadonnées ====================
LABEL maintainer="Job Africa <contact@jobafrica.app>"
LABEL description="Backend FastAPI de Job Africa"

# ==================== Variables d'environnement ====================
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ==================== Répertoire de travail ====================
WORKDIR /app

# ==================== Dépendances système ====================
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

# ==================== Dépendances Python ====================
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ==================== Code source ====================
COPY . .

# ==================== Utilisateur non-root ====================
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# ==================== Port ====================
EXPOSE 8000

# ==================== Health check ====================
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# ==================== Commande par défaut ====================
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
