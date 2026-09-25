#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 17e — DECODAGE HTML (entités → caractères)
 * ═══════════════════════════════════════════════════════════════
 *
 * Corrige clean_text dans normalizer.py pour :
 *   - Décoder les entités HTML (&#xe9; → é, &amp; → &, &nbsp; → espace)
 *   - Permettre au filtre v3 de détecter les actualités encodées
 *
 * FICHIERS MODIFIÉS (1) :
 *   backend/app/services/normalizer.py
 *
 * USAGE :
 *   node 17e-fix-html-decode.js [options]
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

const MODULE_ID = "17e";
const MODULE_NAME = "Décodage HTML";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/services/normalizer.py",
];

// ==================== normalizer.py (avec décodage HTML) ====================

const NORMALIZER = `"""
Normalisation des donnees d'offres d'emploi.

Fonctions :
    - clean_text : nettoie un texte (HTML, entites, espaces)
    - detect_pays : detecte le pays depuis le texte
    - normalize_url : nettoie une URL (retire tracking)
    - parse_date : convertit une date en ISO 8601
    - normalize_job : normalise une offre complete
    - job_fingerprint : empreinte pour la deduplication
"""

import html
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, urlunparse

from slugify import slugify


# ==================== Mapping pays avec alias ====================
PAYS_AFRIQUE_OUEST = {
    # Benin
    "benin": "Benin",
    "benin": "Benin",
    "cotonou": "Benin",
    "porto-novo": "Benin",
    "porto novo": "Benin",
    "parakou": "Benin",
    "abomey": "Benin",
    ".bj": "Benin",
    "+229": "Benin",

    # Togo
    "togo": "Togo",
    "lome": "Togo",
    "kara": "Togo",
    "sokode": "Togo",
    ".tg": "Togo",
    "+228": "Togo",

    # Cote d'Ivoire
    "cote d'ivoire": "Cote d'Ivoire",
    "cote divoire": "Cote d'Ivoire",
    "cote-d'ivoire": "Cote d'Ivoire",
    "ivory coast": "Cote d'Ivoire",
    "abidjan": "Cote d'Ivoire",
    "yamoussoukro": "Cote d'Ivoire",
    "bouake": "Cote d'Ivoire",
    ".ci": "Cote d'Ivoire",
    "+225": "Cote d'Ivoire",

    # Senegal
    "senegal": "Senegal",
    "dakar": "Senegal",
    "thies": "Senegal",
    "saint-louis": "Senegal",
    ".sn": "Senegal",
    "+221": "Senegal",

    # Burkina Faso
    "burkina faso": "Burkina Faso",
    "burkina": "Burkina Faso",
    "ouagadougou": "Burkina Faso",
    "bobo-dioulasso": "Burkina Faso",
    ".bf": "Burkina Faso",
    "+226": "Burkina Faso",

    # Mali
    "mali": "Mali",
    "bamako": "Mali",
    "sikasso": "Mali",
    "segou": "Mali",
    ".ml": "Mali",
    "+223": "Mali",

    # Niger
    "niger": "Niger",
    "niamey": "Niger",
    "zinder": "Niger",
    "maradi": "Niger",
    ".ne": "Niger",
    "+227": "Niger",

    # Guinee
    "guinee": "Guinee",
    "conakry": "Guinee",
    ".gn": "Guinee",
    "+224": "Guinee",

    # Ghana
    "ghana": "Ghana",
    "accra": "Ghana",
    "kumasi": "Ghana",
    "tamale": "Ghana",
    ".gh": "Ghana",
    "+233": "Ghana",

    # Nigeria
    "nigeria": "Nigeria",
    "lagos": "Nigeria",
    "abuja": "Nigeria",
    "kano": "Nigeria",
    "ibadan": "Nigeria",
    "port harcourt": "Nigeria",
    ".ng": "Nigeria",
    "+234": "Nigeria",
}


def clean_text(value: Optional[str]) -> Optional[str]:
    """
    Nettoie un texte :
    - Decode les entites HTML (&#xe9; → e, &amp; → &, &nbsp; → espace)
    - Supprime les balises HTML
    - Supprime les caracteres de controle
    - Normalise les espaces
    """

    if not value:
        return None

    # ==================== DECODAGE HTML ====================
    # Decode les entites HTML : &#xe9; → é, &amp; → &, &nbsp; → espace
    try:
        value = html.unescape(value)
    except Exception:
        pass

    # ==================== SUPPRESSION BALISES ====================
    value = re.sub(r"<[^>]+>", " ", value)

    # ==================== CARACTERES DE CONTROLE ====================
    value = re.sub(r"[\\x00-\\x1f\\x7f]", " ", value)

    # ==================== ESPACES ====================
    value = " ".join(value.split())

    return value.strip() or None


def detect_pays(text: Optional[str]) -> Optional[str]:
    """Detecte le pays dans un texte (fallback)."""
    if not text:
        return None

    text_lower = text.lower()

    sorted_aliases = sorted(PAYS_AFRIQUE_OUEST.keys(), key=len, reverse=True)

    for alias in sorted_aliases:
        if alias.startswith(".") or alias.startswith("+"):
            continue
        if alias in text_lower:
            return PAYS_AFRIQUE_OUEST[alias]

    return None


def detect_pays_avance(
    job: dict,
    source_country: str | None = None,
) -> str | None:
    """
    Detection avancee du pays avec priorite aux signaux fiables.
    """

    # 1. Source
    if source_country:
        return source_country

    # 2. URL
    url = (job.get("url") or "").lower()
    for alias, pays in PAYS_AFRIQUE_OUEST.items():
        if alias.startswith(".") and alias in url:
            return pays

    # 3. Telephone
    text_all = f"{job.get('titre', '')} {job.get('description', '')}"
    for alias, pays in PAYS_AFRIQUE_OUEST.items():
        if alias.startswith("+") and alias in text_all:
            return pays

    # 4. Texte (titre + description)
    text_lower = text_all.lower()
    sorted_aliases = sorted(
        [a for a in PAYS_AFRIQUE_OUEST.keys() if not a.startswith((".", "+"))],
        key=len,
        reverse=True,
    )

    for alias in sorted_aliases:
        if re.search(r"\\b" + re.escape(alias) + r"\\b", text_lower):
            return PAYS_AFRIQUE_OUEST[alias]

    # 5. Ville
    ville = (job.get("ville") or "").lower()
    if ville:
        for alias, pays in PAYS_AFRIQUE_OUEST.items():
            if not alias.startswith((".", "+")) and alias in ville:
                return pays

    return None


def normalize_url(url: Optional[str]) -> Optional[str]:
    """Nettoie une URL (retire tracking)."""
    if not url:
        return None

    try:
        parsed = urlparse(str(url))

        query_parts = []
        if parsed.query:
            for part in parsed.query.split("&"):
                if not part.startswith(("utm_", "fbclid", "gclid")):
                    query_parts.append(part)

        return urlunparse((
            parsed.scheme,
            parsed.netloc.lower(),
            parsed.path.rstrip("/"),
            "",
            "&".join(query_parts),
            "",
        ))
    except Exception:
        return url


def parse_date(value) -> Optional[str]:
    """Convertit une date en ISO 8601."""
    if not value:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, str):
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(value).isoformat()
        except Exception:
            pass

        for fmt in (
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
        ):
            try:
                return datetime.strptime(value, fmt).isoformat()
            except ValueError:
                continue

    return None


def normalize_job(
    job: dict,
    source_country: str | None = None,
) -> dict:
    """
    Normalise une offre d'emploi.
    """

    titre = clean_text(job.get("titre")) or "Offre sans titre"
    description = clean_text(job.get("description"))

    # Detection avancee du pays
    pays = clean_text(job.get("pays"))
    if not pays:
        pays = detect_pays_avance(
            {
                "titre": titre,
                "description": description,
                "url": job.get("url"),
                "ville": job.get("ville"),
            },
            source_country=source_country,
        )

    return {
        "titre": titre[:300],
        "entreprise": clean_text(job.get("entreprise")),
        "pays": pays,
        "ville": clean_text(job.get("ville")),
        "description": description,
        "type_contrat": clean_text(job.get("type_contrat")),
        "niveau": clean_text(job.get("niveau")),
        "categorie": clean_text(job.get("categorie")),
        "date_publication": parse_date(job.get("date_publication")),
        "date_expiration": parse_date(job.get("date_expiration")),
        "url": normalize_url(job.get("url")),
        "source": clean_text(job.get("source")) or "Inconnu",
        "teletravail": bool(job.get("teletravail", False)),
    }


def job_fingerprint(job: dict) -> str:
    """Genere une empreinte pour la deduplication."""
    parts = [
        slugify(job.get("titre") or ""),
        slugify(job.get("entreprise") or ""),
        slugify(job.get("ville") or ""),
    ]

    return "|".join(p for p in parts if p)
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/services/normalizer.py": NORMALIZER,
};

// ==================== Main ====================

async function main() {
  log.banner("MODULE 17e — DECODAGE HTML");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    log.info("Ce module ne fait que modifier normalizer.py.");
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    return;
  }

  log.section("Modification de normalizer.py");

  const results = writeFiles(FILES, {
    overwrite: true,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    "-> " + results.created + " cree(s), " + results.overwritten + " ecrase(s)"
  );

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesOverwritten: results.overwritten,
      note: "Decodage HTML dans clean_text (html.unescape)",
    });
  }

  log.banner("MODULE 17e — TERMINE");

  console.log("");
  console.log("  Modification :");
  console.log("  - normalizer.py (clean_text decode les entites HTML)");
  console.log("");
  console.log("  Ameliorations :");
  console.log("  - &#xe9; → é");
  console.log("  - &amp; → &");
  console.log("  - &nbsp; → espace");
  console.log("  - Tous les titres sont maintenant propres");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Verifier la syntaxe :");
  console.log("     cd backend");
  console.log("     python -c 'from app.services.normalizer import clean_text; print(clean_text(\"&amp;#xe9;\"))'");
  console.log("");
  console.log("  2. Relancer une collecte :");
  console.log("     python -m scripts.run_collect");
  console.log("");
  console.log("  3. Verifier qu'il n'y a plus d'actualites");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});