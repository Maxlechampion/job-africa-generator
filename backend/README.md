# Job Africa — Backend

Backend FastAPI de l'agrégateur intelligent d'offres d'emploi en Afrique de l'Ouest.

## Stack technique

- Python 3.12
- FastAPI 0.115
- Supabase (PostgreSQL managé)
- APScheduler (tâches planifiées)
- Hugging Face (IA gratuite)
- Resend (emails transactionnels)

## Prérequis

- Python 3.11 ou supérieur
- Compte Supabase (gratuit)
- Compte Resend (gratuit)

## Installation

```bash
# Créer l'environnement virtuel
python -m venv venv

# Activer (Windows)
venv\Scripts\activate

# Activer (Linux/Mac)
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

## Configuration

Copier `.env.example` vers `.env` et remplir les variables.

```bash
cp .env.example .env
```

## Lancer le serveur

```bash
uvicorn app.main:app --reload
```

- API : http://127.0.0.1:8000
- Documentation : http://127.0.0.1:8000/docs

## Tests

```bash
pytest -v
```

## Structure

```
app/
├── main.py              Point d'entrée FastAPI
├── core/                Config, logger, supabase, auth
├── schemas/             Modèles Pydantic
├── services/            Logique métier
├── collectors/          Collecteurs de sources
├── api/                 Routes FastAPI
└── ...
```
