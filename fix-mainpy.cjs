#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const mainPath = path.join(ROOT, 'backend/app/main.py');

if (!fs.existsSync(mainPath)) {
  console.error('✗ backend/app/main.py introuvable');
  process.exit(1);
}

let content = fs.readFileSync(mainPath, 'utf8');
const before = content;

// Corrige toutes les doubles virgules
content = content.replace(/,\s*,/g, ',');
content = content.replace(/,\s*\n\s*,/g, ',');

// Affiche le bloc import pour vérification
const match = content.match(/from app\.api import \(([\s\S]*?)\)/);
if (match) {
  console.log('Bloc import :');
  console.log('from app.api import (');
  console.log(match[1]);
  console.log(')');
}

if (before !== content) {
  fs.writeFileSync(mainPath, content, 'utf8');
  console.log('\n✓ main.py corrigé');
} else {
  console.log('\nℹ Aucun changement');
}