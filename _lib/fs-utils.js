import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT = path.resolve(__dirname, "..");
export const BACKUP_DIR = path.join(ROOT, "_backups");

// ==================== Créer un dossier ====================
export function ensureDir(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  fs.mkdirSync(fullPath, { recursive: true });
  return fullPath;
}

// ==================== Vérifier l'existence ====================
export function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

// ==================== Sauvegarder un fichier ====================
export function backup(relativePath) {
  const source = path.join(ROOT, relativePath);
  if (!fs.existsSync(source)) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, timestamp, relativePath);

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(source, backupPath);

  return backupPath;
}

// ==================== Écrire un fichier ====================
export function writeFile(relativePath, content, options = {}) {
  const {
    overwrite = false,
    backup: doBackup = true,
    dryRun = false,
  } = options;

  const fullPath = path.join(ROOT, relativePath);
  const fileExists = fs.existsSync(fullPath);

  if (fileExists && !overwrite) {
    return { status: "skipped", path: relativePath };
  }

  if (fileExists && overwrite && doBackup) {
    backup(relativePath);
  }

  if (dryRun) {
    return {
      status: fileExists ? "would-overwrite" : "would-create",
      path: relativePath,
    };
  }

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trimStart(), "utf8");

  return {
    status: fileExists ? "overwritten" : "created",
    path: relativePath,
  };
}

// ==================== Écrire plusieurs fichiers ====================
export function writeFiles(files, options = {}) {
  const results = {
    created: 0,
    skipped: 0,
    overwritten: 0,
    details: [],
  };

  for (const [relativePath, content] of Object.entries(files)) {
    const result = writeFile(relativePath, content, options);
    results.details.push(result);

    if (result.status === "created") results.created++;
    if (result.status === "skipped") results.skipped++;
    if (result.status === "overwritten") results.overwritten++;
  }

  return results;
}

// ==================== Supprimer un fichier ====================
export function removeFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
}

// ==================== Supprimer un dossier ====================
export function removeDir(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

// ==================== Lister les fichiers ====================
export function listFiles(relativePath, recursive = true) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return [];

  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(ROOT, full);

      if (entry.isDirectory()) {
        if (recursive) walk(full);
      } else {
        files.push(rel);
      }
    }
  }

  walk(fullPath);
  return files;
}