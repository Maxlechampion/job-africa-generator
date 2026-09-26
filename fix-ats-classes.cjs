#!/usr/bin/env node
/**
 * fix-ats-classes.cjs — Corrige tous les tirets dans les noms de classe ATS
 */

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const files = [
  'backend/app/collectors/ats/greenhouse_sources.py',
  'backend/app/collectors/ats/ashby_sources.py',
  'backend/app/collectors/ats/lever.py',
  'backend/app/collectors/ats/greenhouse.py',
  'backend/app/collectors/ats/ashby.py',
];

let totalFixed = 0;

for (const rel of files) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log(`ℹ Absent : ${rel}`);
    continue;
  }

  let content = fs.readFileSync(full, 'utf8');
  const before = content;

  // Remplace les tirets dans les noms de classe Python
  // Patterns courants : M-Kopa, M-KOPA, Paystack-, etc.
  content = content.replace(/class\s+([A-Za-z0-9_]+)-([A-Za-z0-9_-]+)/g, (match, part1, part2) => {
    const clean = `class ${part1}${part2.replace(/-/g, '')}`;
    console.log(`  Corrigé : ${match}  →  ${clean}`);
    return clean;
  });

  // Corrige aussi les références dans les listes (ex: M-KopaGreenhouse,)
  content = content.replace(/([A-Za-z0-9_]+)-([A-Za-z0-9_]+)(Greenhouse|Ashby|Collector|Scraper|RSS)/g, 
    (match, part1, part2, suffix) => {
      const clean = `${part1}${part2}${suffix}`;
      return clean;
    }
  );

  if (content !== before) {
    fs.writeFileSync(full, content, 'utf8');
    console.log(`✓ Corrigé : ${rel}`);
    totalFixed++;
  } else {
    console.log(`ℹ Aucune modification : ${rel}`);
  }
}

console.log('');
console.log(`✓ ${totalFixed} fichier(s) corrigé(s)`);