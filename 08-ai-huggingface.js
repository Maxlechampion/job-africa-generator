#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 08 — IA HUGGING FACE
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute l'IA gratuite via Hugging Face :
 *   - Résumé automatique des offres (FR)
 *   - Extraction avancée de compétences (GLiNER)
 *   - Détection de langue (AfroScope)
 *   - Embeddings pour matching
 *   - Détection du niveau d'expérience
 *
 * USAGE :
 *   node 08-ai-huggingface.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle
 *   --dry-run        Simule
 *   --uninstall      Désinstalle
 *
 * ═══════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";

import { exists, writeFiles, removeFile, ROOT } from "./_lib/fs-utils.js";
import { log } from "./_lib/logger.js";
import { markInstalled, markUninstalled, isInstalled } from "./_lib/registry.js";
import { validateRequirements } from "./_lib/validator.js";

const args = process.argv.slice(2);
const OPTIONS = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  uninstall: args.includes("--uninstall"),
  verbose: args.includes("--verbose"),
};

const MODULE_ID = "08";
const MODULE_NAME = "IA Hugging Face";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/services/job_service.py",
  "backend/app/services/enrichment.py",
];

// ==================== Contenu des fichiers ====================

const AI_CONFIG = `"""
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
SUMMARIZER_MODEL = "Labagaite/gemma-Summarizer-2b-it-LORA-bnb-4bit"

# Extracteur de competences (GLiNER multilingue)
NER_MODEL = "VAGOsolutions/SauerkrautLM-LFM2.5-GLiNER"

# Detecteur de langue africaine (713 langues)
LANGUAGE_MODEL = "UBC-NLP/afroscope-model"

# Embeddings multilingues (97M params)
EMBEDDINGS_MODEL = "ibm-granite/granite-embedding-97m-multilingual-r2"


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
    "software",
    "framework",
    "database",
    "cloud platform",
    "devops tool",
    "data science tool",
    "soft skill",
    "language",
    "certification",
]
`;

const SUMMARIZER = `"""
Resumeur automatique d'offres d'emploi en francais.

Utilise un modele Gemma 2b specialise en francais,
quantifie 4-bit pour tourner sur CPU.
"""

from functools import lru_cache

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

from app.core.logger import get_logger
from app.core.ai_config import SUMMARIZER_MODEL, MAX_TEXT_LENGTH, MAX_SUMMARY_LENGTH


logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _load_model():
    """Charge le modele une seule fois (lazy loading)."""

    logger.info(f"Chargement du resumeur : {SUMMARIZER_MODEL}")

    tokenizer = AutoTokenizer.from_pretrained(SUMMARIZER_MODEL)
    model = AutoModelForCausalLM.from_pretrained(
        SUMMARIZER_MODEL,
        torch_dtype=torch.float32,
        device_map="cpu",
    )

    return tokenizer, model


def summarize(text: str, max_length: int = MAX_SUMMARY_LENGTH) -> str:
    """
    Genere un resume d'une offre d'emploi.

    Args:
        text        : Texte de l'offre
        max_length  : Longueur max du resume

    Returns:
        Resume en francais
    """

    if not text or len(text.strip()) < 50:
        return text or ""

    try:
        tokenizer, model = _load_model()

        prompt = (
            "Resume cette offre d'emploi en francais "
            "en 2 ou 3 phrases concises :\\n\\n"
            f"{text[:MAX_TEXT_LENGTH]}"
        )

        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=1024,
        )

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_length,
                do_sample=False,
                num_beams=4,
                early_stopping=True,
            )

        result = tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Retire le prompt
        if ":\\n\\n" in result:
            result = result.split(":\\n\\n", 1)[-1]

        return result.strip()[:500]

    except Exception as e:
        logger.error(f"Erreur resume : {e}")
        return text[:300]
`;

const SKILL_EXTRACTOR = `"""
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


def flatten_skills(skills: dict) -> list[str]:
    """
    Aplatit un dict de competences en liste unique.
    """

    seen = set()
    flat = []

    for values in skills.values():
        for v in values:
            key = v.lower()
            if key not in seen:
                seen.add(key)
                flat.append(v)

    return flat
`;

const LANGUAGE_DETECTOR = `"""
Detection de la langue d'un texte.

Utilise AfroScope (713 langues africaines + langues
internationales).
"""

from functools import lru_cache

from transformers import pipeline

from app.core.logger import get_logger
from app.core.ai_config import LANGUAGE_MODEL


logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _load_model():
    """Charge le modele une seule fois."""

    logger.info(f"Chargement du detecteur de langue : {LANGUAGE_MODEL}")

    return pipeline(
        "text-classification",
        model=LANGUAGE_MODEL,
        device=-1,
    )


def detect_language(text: str) -> dict:
    """
    Detecte la langue d'un texte.

    Returns:
        {"langue": "fr", "confiance": 0.95}
    """

    if not text or len(text.strip()) < 10:
        return {"langue": "inconnue", "confiance": 0.0}

    try:
        model = _load_model()
        result = model(text[:500])[0]

        return {
            "langue": result["label"],
            "confiance": round(result["score"], 3),
        }

    except Exception as e:
        logger.error(f"Erreur detection langue : {e}")
        return {"langue": "inconnue", "confiance": 0.0}
`;

const EMBEDDINGS = `"""
Embeddings semantiques multilingues.

Utilise IBM Granite 97M (100+ langues).
Utile pour :
    - Deduplication avancée
    - Matching candidat <-> offre
    - Recherche semantique
"""

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.logger import get_logger
from app.core.ai_config import EMBEDDINGS_MODEL


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

    return [
        {"index": int(i), "score": float(scores[i]), "text": documents[i]}
        for i in indices
    ]
`;

const EXPERIENCE_DETECTOR = `"""
Detection du niveau d'experience (Junior / Mid / Senior).
"""

import re


PATTERNS = {
    "Stage": [
        r"\\b(stage|stagiaire|internship|intern|trainee)\\b",
    ],
    "Junior": [
        r"\\b(junior|debutant|debutante|entry[- ]?level|"
        r"jeune diplome|0[- ]?[23] ans? d'experience)\\b",
    ],
    "Senior": [
        r"\\b(senior|confirme|confirmee|expert|experte|"
        r"lead|principal|[5-9]\\+? ans? d'experience|10\\+? ans?)\\b",
    ],
    "Mid": [
        r"\\b(mid[- ]?level|intermediaire|[3-4]\\+? ans? d'experience)\\b",
    ],
}


def detect_experience(job: dict) -> str | None:
    """Detecte le niveau d'experience."""

    texte = (
        f"{job.get('titre', '')} "
        f"{job.get('description', '') or ''}"
    ).lower()

    for niveau, regexes in PATTERNS.items():
        for regex in regexes:
            if re.search(regex, texte, re.IGNORECASE):
                return niveau

    return None
`;

const AI_ENRICHMENT = `"""
Pipeline d'enrichissement IA complet.

Pour chaque offre :
    1. Resume automatique (FR)
    2. Extraction de competences (GLiNER)
    3. Detection de langue (AfroScope)
    4. Detection du niveau d'experience
    5. Sauvegarde en base (resume_ia, langue, niveau)
    6. Liaison des competences dans job_skills

⚠️ Le premier appel est LENT (~30-60s) : chargement des modeles.
Les appels suivants sont rapides (~1-2s par offre).
"""

from datetime import datetime, timezone

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.services.summarizer import summarize
from app.services.skill_extractor import extract_skills, flatten_skills
from app.services.language_detector import detect_language
from app.services.experience_detector import detect_experience
from app.services.skill_service import get_or_create_skill, link_job_to_skill


logger = get_logger(__name__)

TABLE = "jobs"


def enrich_job_ai(job_id: int, job: dict) -> dict:
    """
    Enrichit une offre avec l'IA.

    Returns:
        Stats de l'enrichissement
    """

    text = f"{job.get('titre', '')}\\n{job.get('description', '') or ''}"

    # ==================== 1. Resume ====================
    resume = None
    try:
        resume = summarize(text)
    except Exception as e:
        logger.error(f"Erreur resume #{job_id} : {e}")

    # ==================== 2. Competences ====================
    skills_flat = []
    try:
        skills_dict = extract_skills(text)
        skills_flat = flatten_skills(skills_dict)
    except Exception as e:
        logger.error(f"Erreur skills #{job_id} : {e}")

    # ==================== 3. Langue ====================
    langue = None
    try:
        lang = detect_language(text)
        langue = lang.get("langue")
    except Exception as e:
        logger.error(f"Erreur langue #{job_id} : {e}")

    # ==================== 4. Niveau ====================
    niveau = detect_experience(job)

    # ==================== 5. Liaison competences ====================
    linked = 0
    for skill_name in skills_flat:
        skill = get_or_create_skill(skill_name)
        if skill:
            link_job_to_skill(job_id, skill["id"], score=1.0)
            linked += 1

    # ==================== 6. Mise a jour ====================
    update_payload = {
        "resume_ia": resume,
        "langue": langue,
        "niveau": niveau or job.get("niveau"),
        "enriched_at": datetime.now(timezone.utc).isoformat(),
    }

    update_payload = {k: v for k, v in update_payload.items() if v is not None}

    try:
        supabase.table(TABLE).update(update_payload).eq("id", job_id).execute()
    except Exception as e:
        logger.error(f"Erreur update #{job_id} : {e}")

    return {
        "job_id": job_id,
        "resume": bool(resume),
        "skills_count": linked,
        "langue": langue,
        "niveau": niveau,
    }


def enrich_all_jobs_ai(limit: int = 100) -> dict:
    """
    Enrichit toutes les offres sans resume_ia.

    ⚠️ LIMITER a 100 pour eviter les timeouts.

    Args:
        limit : Nombre max d'offres a enrichir

    Returns:
        Statistiques globales
    """

    r = (
        supabase.table(TABLE)
        .select("*")
        .is_("resume_ia", "null")
        .limit(limit)
        .execute()
    )

    jobs = r.data or []

    logger.info(f"{len(jobs)} offres a enrichir avec l'IA")

    processed = 0
    resumed = 0
    skills_linked = 0
    languages = {}

    for job in jobs:
        try:
            result = enrich_job_ai(job["id"], job)
            processed += 1

            if result["resume"]:
                resumed += 1

            skills_linked += result["skills_count"]

            lang = result.get("langue")
            if lang:
                languages[lang] = languages.get(lang, 0) + 1

        except Exception as e:
            logger.error(f"Erreur enrich #{job['id']} : {e}")

    return {
        "processed": processed,
        "resumed": resumed,
        "skills_linked": skills_linked,
        "languages": languages,
    }
`;

const AI_API = `"""
Routes API pour l'IA.
"""

from fastapi import APIRouter, HTTPException

from app.services.summarizer import summarize
from app.services.skill_extractor import extract_skills, flatten_skills
from app.services.language_detector import detect_language
from app.services.embeddings import encode, similarity
from app.services.ai_enrichment import enrich_all_jobs_ai, enrich_job_ai
from app.services.job_service import get_job, get_jobs


router = APIRouter(prefix="/ai", tags=["ai"])


# ==================== Resume ====================
@router.get("/jobs/{job_id}/summary")
def job_summary(job_id: int):
    """Genere un resume IA d'une offre."""

    job = get_job(job_id)

    if not job:
        raise HTTPException(404, "Offre introuvable")

    text = f"{job.get('titre', '')}\\n{job.get('description', '') or ''}"

    return {"job_id": job_id, "resume": summarize(text)}


# ==================== Competences ====================
@router.get("/jobs/{job_id}/skills")
def job_skills(job_id: int):
    """Extrait les competences d'une offre via GLiNER."""

    job = get_job(job_id)

    if not job:
        raise HTTPException(404, "Offre introuvable")

    text = f"{job.get('titre', '')}\\n{job.get('description', '') or ''}"

    skills = extract_skills(text)

    return {
        "job_id": job_id,
        "competences": flatten_skills(skills),
        "categories": skills,
    }


# ==================== Langue ====================
@router.get("/jobs/{job_id}/language")
def job_language(job_id: int):
    """Detecte la langue d'une offre."""

    job = get_job(job_id)

    if not job:
        raise HTTPException(404, "Offre introuvable")

    text = f"{job.get('titre', '')} {job.get('description', '') or ''}"

    return detect_language(text)


# ==================== Enrichissement complet d'une offre ====================
@router.post("/jobs/{job_id}/enrich")
def job_enrich(job_id: int):
    """Enrichit une offre avec l'IA."""

    job = get_job(job_id)

    if not job:
        raise HTTPException(404, "Offre introuvable")

    return enrich_job_ai(job_id, job)


# ==================== Enrichissement en masse ====================
@router.post("/enrich-all")
def enrich_all(limit: int = 100):
    """
    Enrichit toutes les offres sans resume_ia.

    LIMITER a 100 pour eviter les timeouts.
    """

    return enrich_all_jobs_ai(limit)


# ==================== Matching ====================
@router.post("/match")
def match_jobs(profil: str, limit: int = 10):
    """
    Trouve les offres les plus pertinentes pour un profil.
    """

    jobs = get_jobs(limit=200).get("results", [])

    if not jobs:
        return []

    job_texts = [
        f"{j.get('titre', '')}. {j.get('description', '') or ''}"
        for j in jobs
    ]

    all_texts = [profil] + job_texts
    embeddings = encode(all_texts)

    profil_emb = embeddings[0]
    job_embs = embeddings[1:]

    scores = job_embs @ profil_emb
    indices = scores.argsort()[::-1][:limit]

    return [
        {
            "job_id": jobs[i]["id"],
            "titre": jobs[i].get("titre", ""),
            "score": round(float(scores[i]), 4),
            "url": jobs[i].get("url"),
        }
        for i in indices
    ]
`;

const DOWNLOAD_MODELS = `"""
Telecharge tous les modeles IA en local.

Usage :
    python -m scripts.download_models

⚠️ Le premier lancement prend 10-30 minutes (3 GB).
"""

import os
from transformers import AutoTokenizer, AutoModelForCausalLM
from sentence_transformers import SentenceTransformer
from gliner import GLiNER


# Cache local
os.environ["HF_HOME"] = os.path.join(os.getcwd(), ".hf_cache")


MODELS = {
    "summarizer": "Labagaite/gemma-Summarizer-2b-it-LORA-bnb-4bit",
    "gliner": "VAGOsolutions/SauerkrautLM-LFM2.5-GLiNER",
    "language_id": "UBC-NLP/afroscope-model",
    "embeddings": "ibm-granite/granite-embedding-97m-multilingual-r2",
}


def download_all():
    print("Telechargement des modeles IA...")
    print()

    print("1/4 - Resumeur francais...")
    AutoTokenizer.from_pretrained(MODELS["summarizer"])
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
`;

const REQUIREMENTS_AI = `# ==================== IA (Hugging Face) ====================
transformers==4.46.3
sentence-transformers==3.2.1
torch==2.5.1
accelerate==1.1.1
gliner==0.2.13
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/core/ai_config.py": AI_CONFIG,
  "backend/app/services/summarizer.py": SUMMARIZER,
  "backend/app/services/skill_extractor.py": SKILL_EXTRACTOR,
  "backend/app/services/language_detector.py": LANGUAGE_DETECTOR,
  "backend/app/services/embeddings.py": EMBEDDINGS,
  "backend/app/services/experience_detector.py": EXPERIENCE_DETECTOR,
  "backend/app/services/ai_enrichment.py": AI_ENRICHMENT,
  "backend/app/api/ai.py": AI_API,
  "backend/scripts/download_models.py": DOWNLOAD_MODELS,
  "backend/requirements-ai.txt": REQUIREMENTS_AI,
};

// ==================== Patch de requirements.txt ====================

function patchRequirements() {
  const reqPath = "backend/requirements.txt";

  if (!exists(reqPath)) {
    log.warn("requirements.txt introuvable");
    return false;
  }

  const fullPath = path.join(ROOT, reqPath);
  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("transformers")) {
    log.info("requirements.txt deja patche (IA presente)");
    return true;
  }

  content += "\\n\\n" + REQUIREMENTS_AI;

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(reqPath + " (patché)", "overwritten");
  return true;
}

// ==================== Patch de main.py ====================

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${mainPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("from app.api import") && content.includes(", ai,")) {
    log.info("main.py deja patche (ai present)");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "main.py"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  let modified = false;

  // Import
  const importRegex = /from app\\.api import ([^\\n]+)/;
  const match = content.match(importRegex);

  if (match) {
    const currentImports = match[1];
    if (!currentImports.includes("ai")) {
      content = content.replace(
        importRegex,
        `from app.api import ${currentImports}, ai`
      );
      modified = true;
    }
  }

  // Include router
  if (!content.includes("app.include_router(ai.router)")) {
    const lastIncludeRegex = /app\\.include_router\\((\\w+)\\.router\\)(?!\\napp\\.include_router)/g;
    const includes = content.match(lastIncludeRegex);

    if (includes && includes.length > 0) {
      const lastIncludeStr = includes[includes.length - 1];

      content = content.replace(
        lastIncludeStr,
        lastIncludeStr + "\\napp.include_router(ai.router)"
      );
      modified = true;
    }
  }

  if (modified && !OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
    log.file(mainPath + " (patché)", "overwritten");
  }

  return modified;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 08 — IA HUGGING FACE");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    for (const file of Object.keys(FILES)) {
      if (exists(file)) {
        if (!OPTIONS.dryRun) removeFile(file);
        log.file(file, "removed");
      }
    }
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    log.banner("MODULE 08 — DESINSTALLE");
    return;
  }

  log.section(`Creation de ${Object.keys(FILES).length} fichiers`);

  const results = writeFiles(FILES, {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    `-> ${results.created} cree(s), ${results.overwritten} ecrase(s), ${results.skipped} ignore(s)`
  );

  log.section("Patch de requirements.txt");
  patchRequirements();

  log.section("Patch de main.py");
  patchMainPy();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 08 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  ACTION REQUISE — Installer les dependances IA :");
  console.log("  ────────────────────────────────────────────────");
  console.log("");
  console.log("  cd backend");
  console.log("  venv\\\\Scripts\\\\activate");
  console.log("  pip install -r requirements-ai.txt");
  console.log("");
  console.log("  Puis telecharger les modeles (10-30 min) :");
  console.log("  python -m scripts.download_models");
  console.log("");
  console.log("  Enfin relancer Uvicorn :");
  console.log("  uvicorn app.main:app --reload --reload-dir app");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});