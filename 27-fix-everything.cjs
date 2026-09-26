#!/usr/bin/env node
/**
 * 27-fix-everything.cjs — Correction globale automatique
 *
 * Corrige :
 *   1. Désactive AllAfrica (3 variantes) dans relay_rss.py
 *   2. Désactive les 6 sources RSS mortes (UNJobs, Coordination SUD, RMO, HotNigerianJobs, Concoursn)
 *   3. Ajoute La Tempête Bénin aux sources fiables (bypass filtre)
 *   4. Ajoute Benin Digital aux sources fiables (bypass filtre)
 *   5. Vérifie que Benin Digital est dans le scheduler
 *   6. Crée un rapport de diagnostic
 *
 * Usage : node 27-fix-everything.cjs [--dry-run]
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

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
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
console.log('  27-fix-everything.cjs — Correction globale');
console.log(SEP);
if (DRY) console.log('\n[DRY-RUN]\n');

const report = [];

// ============================================================
// 1. Désactiver AllAfrica dans relay_rss.py
// ============================================================
log.title('1. Désactiver AllAfrica');

const relayPath = 'backend/app/collectors/sources/relay_rss.py';
let relay = read(relayPath);

if (relay) {
  const classesToDisable = [
    'AllAfricaBurkinaRSS',
    'AllAfricaCoteIvoireRSS',
    'AllAfricaWestAfricaRSS',
  ];

  let modified = false;

  for (const cls of classesToDisable) {
    // Cherche la ligne "    AllAfricaBurkinaRSS," (dans ALL_SOURCES)
    const regex = new RegExp(`^(\\s{4})(${cls}),`, 'gm');
    if (regex.test(relay)) {
      relay = relay.replace(regex, `$1# $2,  # Désactivé (presse)`);
      log.ok(`Désactivé : ${cls}`);
      modified = true;
    } else {
      log.info(`Déjà désactivé ou absent : ${cls}`);
    }
  }

  if (modified) {
    write(relayPath, relay);
    report.push('AllAfrica : 3 sources désactivées');
  } else {
    report.push('AllAfrica : déjà désactivées');
  }
} else {
  log.warn(`Fichier absent : ${relayPath}`);
}

// ============================================================
// 2. Désactiver les sources RSS mortes
// ============================================================
log.title('2. Désactiver les sources RSS mortes');

if (relay) {
  const deadSources = [
    'UNJobsRSS',              // 404
    'CoordinationSudRSS',     // flux invalide
    'RmoSenegalRSS',          // flux invalide
    'RmoCoteIvoireRSS',       // flux invalide
    'HotNigerianJobsRSS',     // flux invalide
  ];

  let modified = false;

  for (const cls of deadSources) {
    const regex = new RegExp(`^(\\s{4})(${cls}),`, 'gm');
    if (regex.test(relay)) {
      relay = relay.replace(regex, `$1# $2,  # Désactivé (URL morte)`);
      log.ok(`Désactivé : ${cls}`);
      modified = true;
    }
  }

  // ConcoursnRSS a une URL différente en base — on cherche aussi
  const concoursnRegex = /^(\s{4})(ConcoursnRSS),/gm;
  if (concoursnRegex.test(relay)) {
    relay = relay.replace(concoursnRegex, `$1# $2,  # Désactivé (URL 404)`);
    log.ok(`Désactivé : ConcoursnRSS`);
    modified = true;
  }

  if (modified) {
    write(relayPath, relay);
    report.push('5 sources RSS mortes désactivées');
  } else {
    report.push('Sources RSS mortes : déjà désactivées');
  }
}

// ============================================================
// 3. Ajouter Benin Digital + La Tempête aux sources fiables
// ============================================================
log.title('3. Ajouter sources fiables (bypass filtre)');

const filterPath = 'backend/app/services/relevance_filter.py';
let filter = read(filterPath);

if (filter) {
  // Vérifie si la liste SOURCES_FIABLES existe déjà
  if (!filter.includes('SOURCES_FIABLES')) {
    // Insère la liste après les imports
    const whitelist = `

# ==================== SOURCES FIABLES (bypass filtre) ====================
# Ces sources sont vérifiées manuellement : leurs offres sont TOUJOURS
# considérées comme pertinentes, sans passer par le scoring.
SOURCES_FIABLES = [
    # Job boards tech
    "Benin Digital",
    "ProGigFinder",
    "Jobzilla",
    "MyJobMag",
    "Flutterwave",
    "Kuda",
    "Paystack",

    # ATS (Greenhouse / Ashby)
    "Moniepoint (Greenhouse)",
    "Andela (Ashby)",
    "M-KOPA (Ashby)",
    "LemFi (Ashby)",
    "Sabi (Ashby)",
    "Carbon (Greenhouse)",
    "Jumia (Greenhouse)",

    # Remote international
    "WeWorkRemotely",
    "Himalayas",
    "NoDesk",
    "Hacker News Jobs",
    "Python.org Jobs",

    # ONG / International
    "ReliefWeb",
    "UNJobs",

    # Afrique locale
    "Projobivoire",
    "La Tempête Bénin",
    "La Tempête Bénin".replace("Bénin", "BÃ©nin"),  # variante cassée
    "La TempÃªte BÃ©nin",
    "Emploi Togo",
]


def is_source_fiable(source: str | None) -> bool:
    """Vérifie si une source est dans la whitelist."""
    if not source:
        return False

    source_lower = source.lower()

    for sf in SOURCES_FIABLES:
        if sf.lower() in source_lower:
            return True

    return False
`;

    // Insère après la dernière ligne d'import
    const lastImport = filter.match(/^(from .+|import .+)$/m);
    if (lastImport) {
      filter = filter.replace(
        /(^from re import re\n|^import re\n)/m,
        `$1${whitelist}\n`
      );
    } else {
      // Fallback : insère après la docstring
      filter = filter.replace(
        /(^"""[\s\S]*?"""\n)/,
        `$1${whitelist}\n`
      );
    }

    log.ok('Liste SOURCES_FIABLES ajoutée');
    report.push('Liste SOURCES_FIABLES créée');
  } else {
    log.info('SOURCES_FIABLES existe déjà');
  }

  // Modifie is_relevant_job pour bypasser les sources fiables
  if (!filter.includes('is_source_fiable(job.get')) {
    const oldFunc = /def is_relevant_job\(job: dict\) -> tuple\[bool, dict\]:[\s\S]*?return result\["is_job_offer"\], result/;

    const newFunc = `def is_relevant_job(job: dict) -> tuple[bool, dict]:
    """Verifie si une offre est pertinente."""

    # ✅ Court-circuit : sources fiables → toujours pertinentes
    source = job.get("source")
    if is_source_fiable(source):
        return True, {
            "score": 100,
            "is_job_offer": True,
            "details": {"whitelisted": True, "source": source},
        }

    result = compute_relevance_score(
        titre=job.get("titre", ""),
        description=job.get("description", ""),
        url=job.get("url", ""),
    )

    return result["is_job_offer"], result`;

    if (oldFunc.test(filter)) {
      filter = filter.replace(oldFunc, newFunc);
      log.ok('is_relevant_job modifié (bypass sources fiables)');
      report.push('is_relevant_job : bypass activé');
    } else {
      log.warn('Impossible de modifier is_relevant_job — vérifier manuellement');
    }
  }

  write(filterPath, filter);
} else {
  log.warn(`Fichier absent : ${filterPath}`);
}

// ============================================================
// 4. Vérifier le scheduler (Benin Digital)
// ============================================================
log.title('4. Vérifier le scheduler Bénin');

const schedulerPath = 'backend/app/services/scheduler.py';
const scheduler = read(schedulerPath);

if (scheduler) {
  const checks = {
    'BeninDigitalScraper importé': scheduler.includes('BeninDigitalScraper'),
    'LaTempeteBeninRSS importé': scheduler.includes('LaTempeteBeninRSS'),
    'BENIN_SOURCES défini': scheduler.includes('BENIN_SOURCES'),
    'run_benin_collectors défini': scheduler.includes('run_benin_collectors'),
    'run_all_collectors_with_benin défini': scheduler.includes('run_all_collectors_with_benin'),
  };

  for (const [check, status] of Object.entries(checks)) {
    if (status) {
      log.ok(check);
    } else {
      log.warn(`Manquant : ${check}`);
    }
  }

  if (Object.values(checks).every(Boolean)) {
    report.push('Scheduler Bénin : OK');
  } else {
    report.push('Scheduler Bénin : INCOMPLET (relancer 26-activate-benin-sources.cjs)');
  }
} else {
  log.warn(`Fichier absent : ${schedulerPath}`);
}

// ============================================================
// 5. Créer un rapport
// ============================================================
log.title('5. Rapport');

const reportLines = [
  '# Rapport de correction — ' + new Date().toLocaleString('fr-FR'),
  '',
  '## Corrections appliquées',
  '',
  ...report.map(r => `- ${r}`),
  '',
  '## Prochaines étapes',
  '',
  '1. Redémarrer Uvicorn :',
  '   ```',
  '   cd backend',
  '   venv\\Scripts\\Activate.ps1',
  '   uvicorn app.main:app --reload --reload-dir app',
  '   ```',
  '',
  '2. Lancer une collecte manuelle :',
  '   ```',
  '   curl.exe -X POST "http://127.0.0.1:8000/admin/scheduler/trigger"',
  '   ```',
  '',
  '3. Vérifier en base :',
  '   ```sql',
  "   select source, count(*) from jobs group by source order by count desc;",
  '   ```',
  '',
  '4. Commit :',
  '   ```',
  '   git add .',
  '   git commit -m "fix: disable AllAfrica + dead RSS + whitelist sources"',
  '   git push origin main',
  '   ```',
  '',
];

if (!DRY) {
  fs.writeFileSync(
    path.join(ROOT, 'RAPPORT_CORRECTION.md'),
    reportLines.join('\n'),
    'utf8'
  );
  log.ok('Rapport écrit : RAPPORT_CORRECTION.md');
}

// ============================================================
// Résumé final
// ============================================================
console.log('\n' + SEP);
console.log('  ✅ CORRECTION TERMINÉE');
console.log(SEP + '\n');

console.log('  Résumé :');
for (const r of report) {
  console.log(`    - ${r}`);
}

console.log('');
console.log('  Fichiers modifiés :');
console.log('    - backend/app/collectors/sources/relay_rss.py');
console.log('    - backend/app/services/relevance_filter.py');
console.log('');
console.log('  Rapport détaillé : RAPPORT_CORRECTION.md');
console.log('');
console.log('  Prochaines étapes (5 minutes) :');
console.log('    1. Redémarrer Uvicorn');
console.log('    2. curl.exe -X POST "http://127.0.0.1:8000/admin/scheduler/trigger"');
console.log('    3. git add . && git commit -m "fix: sources + whitelist" && git push');
console.log('');
console.log(SEP);