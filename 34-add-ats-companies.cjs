#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  34-add-ats-companies.cjs — Expansion des APIs ATS publiques
 * ═══════════════════════════════════════════════════════════════
 *
 * Actions :
 *   1. Ajoute un collecteur Lever (nouveau)
 *   2. Étend Greenhouse avec 15+ entreprises africaines
 *   3. Étend Ashby avec 10+ entreprises africaines
 *   4. Patch le scheduler pour tout activer
 *   5. Patch l'endpoint admin pour tester
 *
 * Usage : node 34-add-ats-companies.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');

const SEP = '='.repeat(70);
const log = {
  ok:    (m) => console.log(`\x1b[32m✓\x1b[0m  ${m}`),
  warn:  (m) => console.log(`\x1b[33m⚠\x1b[0m  ${m}`),
  info:  (m) => console.log(`\x1b[34mℹ\x1b[0m  ${m}`),
  title: (m) => console.log(`\n\x1b[1m\x1b[36m${m}\x1b[0m\n`),
};

function backup(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dst = path.join(ROOT, '_backups', ts, rel);
  if (!DRY) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

function write(rel, content) {
  backup(rel);
  const full = path.join(ROOT, rel);
  if (!DRY) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  log.ok(`Écrit : ${rel}`);
}

// ============================================================
console.log(SEP);
console.log('  34-add-ats-companies.cjs');
console.log(SEP);
if (DRY) console.log('\n[DRY-RUN]\n');

// ============================================================
// 1. COLLECTEUR LEVER (nouveau)
// ============================================================
log.title('1. Collecteur Lever (nouveau)');

const LEVER_COLLECTOR = `"""
Collecteur Lever — API publique.

API : https://api.lever.co/v0/postings/{company}?mode=json
Aucune cle requise. Retourne du JSON structure.

Reference : https://github.com/lever/postings-api
"""

import httpx

from app.collectors.ats.base_ats import BaseATSCollector
from app.services.normalizer import clean_text, parse_date


class LeverCollector(BaseATSCollector):
    """
    Collecteur pour les entreprises utilisant Lever.

    Attributs :
        company     : Slug de l'entreprise (ex: "paystack")
        source_name : Nom affiche
        country     : Pays par defaut
    """

    def __init__(
        self,
        company: str,
        source_name: str,
        country: str | None = None,
    ):
        super().__init__()

        self.company = company
        self.source_name = source_name
        self.country = country
        self.name = source_name
        self.ats_type = "lever"

        self.api_url = f"https://api.lever.co/v0/postings/{company}?mode=json"

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Lever."""

        headers = {
            "User-Agent": "JobAfricaBot/1.0",
            "Accept": "application/json",
        }

        try:
            with httpx.Client(timeout=20, follow_redirects=True) as client:
                response = client.get(self.api_url, headers=headers)

                if response.status_code != 200:
                    self.logger.warning(
                        f"Lever {self.company} : HTTP {response.status_code}"
                    )
                    return []

                data = response.json()

        except Exception as e:
            self.logger.error(f"Erreur Lever {self.company} : {e}")
            return []

        if not isinstance(data, list):
            self.logger.warning(
                f"Lever {self.company} : structure inattendue"
            )
            return []

        jobs = []

        for item in data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        self.logger.info(f"Lever {self.company} : {len(jobs)} offres")
        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Lever."""

        titre = clean_text(item.get("text"))
        if not titre:
            return None

        url = item.get("hostedUrl") or item.get("applyUrl")
        if not url:
            return None

        # Localisation
        categories = item.get("categories") or {}
        location = clean_text(categories.get("location"))
        team = clean_text(categories.get("team"))
        commitment = clean_text(categories.get("commitment"))

        # Teletravail
        teletravail = False
        if location and "remote" in location.lower():
            teletravail = True

        # Timestamp en millisecondes -> ISO
        created_at = item.get("createdAt")
        date_pub = None
        if created_at:
            try:
                from datetime import datetime, timezone
                date_pub = datetime.fromtimestamp(
                    created_at / 1000, tz=timezone.utc
                ).isoformat()
            except Exception:
                pass

        return {
            "titre": titre,
            "entreprise": self.source_name,
            "pays": self.country,
            "ville": location,
            "description": clean_text(item.get("descriptionPlain")),
            "type_contrat": commitment,
            "niveau": None,
            "categorie": team,
            "date_publication": date_pub,
            "date_expiration": None,
            "url": url,
            "source": f"{self.source_name} (Lever)",
            "teletravail": teletravail,
        }
`;

write("backend/app/collectors/ats/lever.py", LEVER_COLLECTOR);

// ============================================================
// 2. ÉTENDRE GREENHOUSE avec 15+ entreprises africaines
// ============================================================
log.title('2. Étendre Greenhouse (15+ entreprises)');

const GREENHOUSE_SOURCES = `"""
Registre des entreprises africaines utilisant Greenhouse.

Ces entreprises publient leurs offres via des APIs publiques,
sans cle ni authentification.

Verifier regulierement que les tokens sont toujours valides.
"""

from app.collectors.ats.greenhouse import GreenhouseCollector


# ==================== Fintech ====================

class MoniepointGreenhouse(GreenhouseCollector):
    """Moniepoint - Fintech nigeriane (Lagos)."""
    def __init__(self):
        super().__init__(token="moniepoint", source_name="Moniepoint", country="Nigeria")


class FlutterwaveGreenhouse(GreenhouseCollector):
    """Flutterwave - Fintech paiements (panafricain)."""
    def __init__(self):
        super().__init__(token="flutterwave", source_name="Flutterwave", country="Nigeria")


class PaystackGreenhouse(GreenhouseCollector):
    """Paystack - Fintech paiements (Nigeria)."""
    def __init__(self):
        super().__init__(token="paystack", source_name="Paystack", country="Nigeria")


class CarbonGreenhouse(GreenhouseCollector):
    """Carbon (ex-OneFi) - Fintech credit (Nigeria)."""
    def __init__(self):
        super().__init__(token="carbon", source_name="Carbon", country="Nigeria")


class TeamAptGreenhouse(GreenhouseCollector):
    """TeamApt - Fintech paiements (Nigeria)."""
    def __init__(self):
        super().__init__(token="teamapt", source_name="TeamApt", country="Nigeria")


class KudaGreenhouse(GreenhouseCollector):
    """Kuda - Neobanque (Nigeria)."""
    def __init__(self):
        super().__init__(token="kuda", source_name="Kuda", country="Nigeria")


class ChipperCashGreenhouse(GreenhouseCollector):
    """Chipper Cash - Transfert d'argent (panafricain)."""
    def __init__(self):
        super().__init__(token="chippercash", source_name="Chipper Cash", country="Kenya")


class WaveGreenhouse(GreenhouseCollector):
    """Wave - Mobile Money (Senegal/CI)."""
    def __init__(self):
        super().__init__(token="wave", source_name="Wave", country="Senegal")


# ==================== E-commerce / Marketplaces ====================

class JumiaGreenhouse(GreenhouseCollector):
    """Jumia - E-commerce panafricain."""
    def __init__(self):
        super().__init__(token="jumia", source_name="Jumia")


class KongaGreenhouse(GreenhouseCollector):
    """Konga - E-commerce (Nigeria)."""
    def __init__(self):
        super().__init__(token="konga", source_name="Konga", country="Nigeria")


class KilimallGreenhouse(GreenhouseCollector):
    """Kilimall - E-commerce (Kenya)."""
    def __init__(self):
        super().__init__(token="kilimall", source_name="Kilimall", country="Kenya")


# ==================== Tech / SaaS ====================

class AndelaGreenhouse(GreenhouseCollector):
    """Andela - Talent marketplace (panafricain)."""
    def __init__(self):
        super().__init__(token="andela", source_name="Andela")


class TwigaGreenhouse(GreenhouseCollector):
    """Twiga Foods - AgTech (Kenya)."""
    def __init__(self):
        super().__init__(token="twigafoods", source_name="Twiga Foods", country="Kenya")


class M-KopaGreenhouse(GreenhouseCollector):
    """M-KOPA - Energie solaire (Kenya/Uganda/Nigeria)."""
    def __init__(self):
        super().__init__(token="m-kopa", source_name="M-KOPA")


# ==================== ONG / Impact ====================

class OneAcreFundGreenhouse(GreenhouseCollector):
    """One Acre Fund - AgTech (Afrique de l'Est)."""
    def __init__(self):
        super().__init__(token="oneacrefund", source_name="One Acre Fund")


class GiveDirectlyGreenhouse(GreenhouseCollector):
    """GiveDirectly - ONG cash transfers (panafricain)."""
    def __init__(self):
        super().__init__(token="givedirectly", source_name="GiveDirectly")


# ==================== Registre ====================

ALL_GREENHOUSE_SOURCES = [
    # Fintech
    MoniepointGreenhouse,
    FlutterwaveGreenhouse,
    PaystackGreenhouse,
    CarbonGreenhouse,
    TeamAptGreenhouse,
    KudaGreenhouse,
    ChipperCashGreenhouse,
    WaveGreenhouse,

    # E-commerce
    JumiaGreenhouse,
    KongaGreenhouse,
    KilimallGreenhouse,

    # Tech / SaaS
    AndelaGreenhouse,
    TwigaGreenhouse,
    M-KopaGreenhouse,

    # ONG / Impact
    OneAcreFundGreenhouse,
    GiveDirectlyGreenhouse,
]
`;

write("backend/app/collectors/ats/greenhouse_sources.py", GREENHOUSE_SOURCES);

// ============================================================
// 3. ÉTENDRE ASHBY avec 10+ entreprises africaines
// ============================================================
log.title('3. Étendre Ashby (10+ entreprises)');

const ASHBY_SOURCES = `"""
Registre des entreprises africaines utilisant Ashby.

Ashby expose une API publique avec fourchettes de salaire.
"""

from app.collectors.ats.ashby import AshbyCollector


class M-KopaAshby(AshbyCollector):
    """M-KOPA - Energie solaire (Afrique de l'Est)."""
    def __init__(self):
        super().__init__(board_name="m-kopa", source_name="M-KOPA")


class LemFiAshby(AshbyCollector):
    """LemFi (ex-Lemonade Finance) - Fintech transfert."""
    def __init__(self):
        super().__init__(board_name="lemfi", source_name="LemFi")


class SabiAshby(AshbyCollector):
    """Sabi - B2B e-commerce (Nigeria/Kenya)."""
    def __init__(self):
        super().__init__(board_name="sabi", source_name="Sabi")


class RelianceHealthAshby(AshbyCollector):
    """Reliance Health - HealthTech (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="reliance-health", source_name="Reliance Health", country="Nigeria")


class PagaAshby(AshbyCollector):
    """Paga - Fintech (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="paga", source_name="Paga", country="Nigeria")


class FairMoneyAshby(AshbyCollector):
    """FairMoney - Fintech (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="fairmoney", source_name="FairMoney", country="Nigeria")


class PiggyvestAshby(AshbyCollector):
    """PiggyVest - Epargne (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="piggyvest", source_name="PiggyVest", country="Nigeria")


class CowrywiseAshby(AshbyCollector):
    """Cowrywise - Epargne/investissement (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="cowrywise", source_name="Cowrywise", country="Nigeria")


class SpleetAshby(AshbyCollector):
    """Spleet - Proptech (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="spleet", source_name="Spleet", country="Nigeria")


class StearsAshby(AshbyCollector):
    """Stears - Data/Media (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="stears", source_name="Stears", country="Nigeria")


ALL_ASHBY_SOURCES = [
    M-KopaAshby,
    LemFiAshby,
    SabiAshby,
    RelianceHealthAshby,
    PagaAshby,
    FairMoneyAshby,
    PiggyvestAshby,
    CowrywiseAshby,
    SpleetAshby,
    StearsAshby,
]
`;

write("backend/app/collectors/ats/ashby_sources.py", ASHBY_SOURCES);

// ============================================================
// 4. PATCH SCHEDULER
// ============================================================
log.title('4. Patch scheduler.py');

const schedulerPath = 'backend/app/services/scheduler.py';
const schedulerFull = path.join(ROOT, schedulerPath);

if (fs.existsSync(schedulerFull)) {
  let content = fs.readFileSync(schedulerFull, 'utf8');

  // Ajoute les imports ATS si absent
  if (!content.includes('ALL_GREENHOUSE_SOURCES')) {
    content = content.replace(
      /^(from app\.services\.log_service import log_collect)/m,
      `$1
from app.collectors.ats.greenhouse_sources import ALL_GREENHOUSE_SOURCES
from app.collectors.ats.ashby_sources import ALL_ASHBY_SOURCES
from app.collectors.ats.lever import LeverCollector`
    );
    log.ok('Imports ATS étendus ajoutés');
  }

  // Ajoute le bloc ATS etendu dans run_all_collectors
  if (!content.includes('ALL_GREENHOUSE_SOURCES')) {
    const atsBlock = `

# ==================== COLLECTE ATS ETENDUE ====================
def run_extended_ats_collectors() -> dict:
    """Lance les collecteurs ATS etendus (Greenhouse + Ashby)."""

    logger.info("-" * 60)
    logger.info("Collecte ATS etendue...")
    logger.info("-" * 60)

    total_collected = 0
    total_inserted = 0
    details = []

    all_sources = ALL_GREENHOUSE_SOURCES + ALL_ASHBY_SOURCES

    for CollectorClass in all_sources:
        try:
            collector = CollectorClass()
            name = collector.name

            jobs = collector.collect()
            collected = len(jobs)

            if collected == 0:
                details.append({
                    "source": name,
                    "status": "empty",
                    "collected": 0,
                })
                continue

            result = bulk_create_jobs(jobs)
            inserted = result.get("inserted", 0)

            total_collected += collected
            total_inserted += inserted

            details.append({
                "source": name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
            })

            logger.info(f"  [OK] {name} : {collected} collectees, {inserted} inserees")

        except Exception as e:
            details.append({
                "source": CollectorClass.__name__,
                "status": "error",
                "error": str(e)[:200],
            })

    return {
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "details": details,
    }
`;

    // Insère avant "Nettoyage"
    content = content.replace(
      /# ==================== Nettoyage ====================/,
      atsBlock + '\n# ==================== Nettoyage ===================='
    );
    log.ok('Bloc ATS étendu ajouté');
  }

  // Ajoute l'appel dans le wrapper
  if (!content.includes('run_extended_ats_collectors()')) {
    content = content.replace(
      /(africa = run_africa_collectors\(\))/,
      `$1

    # ==================== COLLECTE ATS ETENDUE ====================
    ats_extended = run_extended_ats_collectors()

    result["total_collected"] += ats_extended["total_collected"]
    result["total_inserted"] += ats_extended["total_inserted"]
    result["details"].extend(ats_extended["details"])`
    );
    log.ok('Appel ATS étendu intégré');
  }

  if (!DRY) {
    backup(schedulerPath);
    fs.writeFileSync(schedulerFull, content, 'utf8');
  }
  log.ok('scheduler.py mis à jour');
}

// ============================================================
// 5. PATCH ADMIN SOURCES TEST
// ============================================================
log.title('5. Patch admin_sources_test.py');

const apiPath = 'backend/app/api/admin_sources_test.py';
const apiFull = path.join(ROOT, apiPath);

if (fs.existsSync(apiFull)) {
  let content = fs.readFileSync(apiFull, 'utf8');

  if (!content.includes('LeverCollector')) {
    const newSources = `
    try:
        from app.collectors.ats.lever import LeverCollector
        sources["lever"] = LeverCollector
    except ImportError:
        pass
`;

    content = content.replace(
      /(\n\s+return sources)/,
      `${newSources}$1`
    );

    if (!DRY) {
      backup(apiPath);
      fs.writeFileSync(apiFull, content, 'utf8');
    }
    log.ok('admin_sources_test.py étendu');
  }
}

// ============================================================
// 6. Résumé
// ============================================================
console.log('\n' + SEP);
console.log('  ✅ EXPANSION ATS APPLIQUÉE');
console.log(SEP + '\n');

console.log('  Nouveautés :');
console.log('  - Collecteur Lever (nouveau)');
console.log('  - 16 entreprises Greenhouse (fintech, e-commerce, ONG)');
console.log('  - 10 entreprises Ashby (fintech, healthtech)');
console.log('');
console.log('  Total : 26+ entreprises ATS surveillées');
console.log('');
console.log('  Prochaines étapes :');
console.log('  1. Redémarrer Uvicorn');
console.log('  2. Lancer une collecte :');
console.log('     curl.exe -X POST "http://127.0.0.1:8000/admin/scheduler/trigger"');
console.log('  3. Vérifier en base :');
console.log('     select source, count(*) from jobs where source like "%Greenhouse%" or source like "%Ashby%" group by source;');
console.log('');
console.log('  Commit :');
console.log('     git add .');
console.log('     git commit -m "feat: expansion ATS (Lever + 26 entreprises)"');
console.log('     git push origin main');
console.log('');
console.log(SEP);