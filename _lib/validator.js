/**
 * Validation des prérequis avant exécution d'un module.
 */

import { exists } from "./fs-utils.js";
import { log } from "./logger.js";

/**
 * Vérifie une liste de prérequis.
 *
 * @param {string[]} requirements - Liste de chemins à vérifier
 * @param {string} moduleName - Nom du module (pour les messages)
 * @returns {boolean} - true si tous les prérequis sont OK
 */
export function validateRequirements(requirements, moduleName) {
  const missing = [];

  for (const req of requirements) {
    if (!exists(req)) {
      missing.push(req);
    }
  }

  if (missing.length > 0) {
    log.error(`Module "${moduleName}" : prérequis manquants :`);
    for (const m of missing) {
      console.log(`  - ${m}`);
    }
    console.log("");
    log.info("Installez d'abord les modules requis.");
    return false;
  }

  return true;
}

/**
 * Vérifie qu'un module n'est pas déjà installé.
 */
export function checkNotInstalled(isInstalled, moduleName, force) {
  if (isInstalled && !force) {
    log.warn(`Module "${moduleName}" déjà installé.`);
    log.info("Utilisez --force pour réinstaller, ou --skip-existing pour ignorer.");
    return false;
  }
  return true;
}