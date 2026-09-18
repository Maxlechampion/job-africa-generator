/**
 * Registre des modules installés.
 *
 * Permet de :
 * - Suivre l'état d'installation de chaque module
 * - Éviter les réinstallations
 * - Permettre le rollback
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const STATE_FILE = path.join(ROOT, "_state", "installed.json");

// ==================== Lire l'état ====================
export function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { modules: {} };
  }

  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch (e) {
    return { modules: {} };
  }
}

// ==================== Écrire l'état ====================
export function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

// ==================== Marquer un module installé ====================
export function markInstalled(moduleId, metadata = {}) {
  const state = readState();

  state.modules[moduleId] = {
    installedAt: new Date().toISOString(),
    version: metadata.version || "1.0.0",
    files: metadata.files || [],
    ...metadata,
  };

  writeState(state);
}

// ==================== Marquer un module désinstallé ====================
export function markUninstalled(moduleId) {
  const state = readState();

  if (state.modules[moduleId]) {
    state.modules[moduleId].uninstalledAt = new Date().toISOString();
    state.modules[moduleId].status = "uninstalled";
  }

  writeState(state);
}

// ==================== Vérifier si installé ====================
export function isInstalled(moduleId) {
  const state = readState();
  const module = state.modules[moduleId];
  return module && !module.uninstalledAt;
}

// ==================== Lister tous les modules ====================
export function listModules() {
  const state = readState();
  return Object.entries(state.modules).map(([id, data]) => ({
    id,
    ...data,
    active: !data.uninstalledAt,
  }));
}