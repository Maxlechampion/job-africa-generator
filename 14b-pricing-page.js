#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 14b — PAGE TARIFS (Frontend)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute la page Tarifs et les composants de monétisation :
 *   - PricingView.vue (page des tarifs)
 *   - PremiumBadge.vue (badge "⭐ Premium")
 *   - SponsoredBanner.vue (bannière publicitaire)
 *   - UpgradeModal.vue (modale d'upgrade)
 *   - Route /pricing dans le router
 *   - Lien "Tarifs" dans AppHeader
 *
 * USAGE :
 *   node 14b-pricing-page.js [options]
 *
 * PRÉREQUIS :
 *   - Modules 00, 09, 14 installés
 *   - Backend /payments/tarifs fonctionnel
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

const MODULE_ID = "14b";
const MODULE_NAME = "Page Tarifs";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "frontend/src/views/HomeView.vue",
  "frontend/src/router/index.js",
  "frontend/src/components/layout/AppHeader.vue",
  "backend/app/api/payments.py",
];

// ==================== PricingView.vue ====================

const PRICING_VIEW = `<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import paymentApi from "@/services/payment";
import BaseButton from "@/components/ui/BaseButton.vue";

const router = useRouter();
const auth = useAuthStore();

const tarifs = ref({});
const moyens = ref({});
const loading = ref(true);

async function loadTarifs() {
  try {
    const data = await paymentApi.getTarifs();
    tarifs.value = data.tarifs || {};
    moyens.value = data.moyens_par_pays || {};
  } catch (e) {
    console.error("Erreur chargement tarifs :", e);
  } finally {
    loading.value = false;
  }
}

async function souscrire(type) {
  if (!auth.isAuthenticated) {
    router.push({ name: "login", query: { redirect: "/pricing" } });
    return;
  }

  try {
    const result = await paymentApi.initiate(type);
    alert(
      \`Transaction créée !\\n\\n\` +
      \`Référence : \${result.reference}\\n\` +
      \`Montant : \${result.montant} \${result.devise}\\n\\n\` +
      \`Suivez les instructions de paiement.\`
    );
  } catch (e) {
    console.error(e);
    alert("Erreur lors de la création de la transaction");
  }
}

onMounted(loadTarifs);
</script>

<template>
  <div class="container-page py-8 sm:py-12">
    <div class="text-center mb-10 sm:mb-14">
      <h1 class="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-3">
        💳 Boostez votre recherche d'emploi
      </h1>
      <p class="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
        Mettez en avant votre profil et accédez en priorité aux meilleures offres
        d'emploi en Afrique de l'Ouest.
      </p>
    </div>

    <div v-if="loading" class="text-center py-16">
      <div class="w-8 h-8 mx-auto border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
    </div>

    <template v-else>
      <!-- Candidats -->
      <section class="mb-12 sm:mb-16">
        <h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
          👤 Pour les candidats
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div class="card flex flex-col">
            <div class="text-3xl sm:text-4xl mb-3">⭐</div>
            <h3 class="font-bold text-lg sm:text-xl mb-2">Boost d'offre</h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
              Mettez votre offre en avant pendant 30 jours en haut des résultats.
            </p>
            <div class="text-2xl sm:text-3xl font-bold text-brand-600 mb-4">
              {{ tarifs.premium_job?.prix || 2000 }} FCFA
            </div>
            <BaseButton class="w-full" @click="souscrire('premium_job')">
              Booster maintenant
            </BaseButton>
          </div>

          <div class="card flex flex-col border-2 border-brand-500 relative">
            <div class="absolute -top-3 left-4 bg-brand-500 text-white text-xs px-2 py-0.5 rounded font-semibold">
              ⭐ Recommandé
            </div>
            <div class="text-3xl sm:text-4xl mb-3">👑</div>
            <h3 class="font-bold text-lg sm:text-xl mb-2">Premium Candidat</h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
              Accès prioritaire aux nouvelles offres + alertes instantanées.
            </p>
            <div class="text-2xl sm:text-3xl font-bold text-brand-600 mb-4">
              {{ tarifs.subscription_premium?.prix || 5000 }} FCFA
              <span class="text-sm font-normal text-slate-500">/ mois</span>
            </div>
            <BaseButton class="w-full" @click="souscrire('subscription_premium')">
              Devenir Premium
            </BaseButton>
          </div>
        </div>
      </section>

      <!-- Entreprises -->
      <section class="mb-12 sm:mb-16">
        <h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
          🏢 Pour les entreprises
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div class="card flex flex-col">
            <div class="text-3xl sm:text-4xl mb-3">🎯</div>
            <h3 class="font-bold text-lg sm:text-xl mb-2">Offre sponsorisée</h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
              Votre offre en tête des résultats pendant 30 jours.
            </p>
            <div class="text-2xl sm:text-3xl font-bold text-brand-600 mb-4">
              {{ tarifs.sponsored_job?.prix || 25000 }} FCFA
            </div>
            <BaseButton variant="outline" class="w-full" @click="souscrire('sponsored_job')">
              Sponsoriser
            </BaseButton>
          </div>

          <div class="card flex flex-col">
            <div class="text-3xl sm:text-4xl mb-3">📢</div>
            <h3 class="font-bold text-lg sm:text-xl mb-2">Bannière publicitaire</h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
              Bannière visible sur la page d'accueil pendant 1 semaine.
            </p>
            <div class="text-2xl sm:text-3xl font-bold text-brand-600 mb-4">
              {{ tarifs.banner_week?.prix || 50000 }} FCFA
            </div>
            <BaseButton variant="outline" class="w-full" @click="souscrire('banner_week')">
              Acheter une bannière
            </BaseButton>
          </div>
        </div>
      </section>

      <!-- Moyens de paiement -->
      <section>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
          💳 Moyens de paiement disponibles
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div v-for="(methods, pays) in moyens" :key="pays" class="card">
            <h3 class="font-semibold text-slate-800 mb-3 text-sm sm:text-base">
              {{ pays }}
            </h3>
            <div class="flex flex-wrap gap-1.5 sm:gap-2">
              <span
                v-for="m in methods"
                :key="m.id"
                class="px-2 py-1 rounded bg-slate-100 text-xs text-slate-600"
              >
                {{ m.icone }} {{ m.label }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div class="mt-12 sm:mt-16 text-center card bg-gradient-to-br from-brand-50 to-white border-brand-100">
        <h2 class="text-lg sm:text-xl font-bold text-slate-800 mb-2">
          💬 Une question sur nos tarifs ?
        </h2>
        <p class="text-sm text-slate-500">
          Contactez-nous à <strong>contact@jobafrica.app</strong>
        </p>
      </div>
    </template>
  </div>
</template>
`;

// ==================== PremiumBadge.vue ====================

const PREMIUM_BADGE = `<script setup>
defineProps({
  size: { type: String, default: "sm" },
});

const sizes = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-md font-semibold',
      'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm',
      sizes[size],
    ]"
  >
    ⭐ Premium
  </span>
</template>
`;

// ==================== UpgradeModal.vue ====================

const UPGRADE_MODAL = `<script setup>
import { ref, onMounted } from "vue";
import paymentApi from "@/services/payment";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps({
  jobId: { type: Number, required: true },
});

const emit = defineEmits(["close", "paid"]);

const loading = ref(false);
const transaction = ref(null);
const error = ref("");

async function initiate() {
  loading.value = true;
  error.value = "";

  try {
    transaction.value = await paymentApi.boostJob(props.jobId);
  } catch (e) {
    error.value = "Impossible de créer la transaction";
  } finally {
    loading.value = false;
  }
}

onMounted(initiate);
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
      <h2 class="text-xl font-bold text-slate-800 mb-2">
        ⭐ Passer en Premium
      </h2>
      <p class="text-sm text-slate-500 mb-6">
        Votre offre sera mise en avant pendant 30 jours en haut des résultats.
      </p>

      <div class="bg-slate-50 rounded-xl p-4 mb-6">
        <div class="flex justify-between items-center">
          <span class="text-sm text-slate-600">Montant</span>
          <span class="font-bold text-slate-800">
            {{ transaction?.montant || 2000 }} FCFA
          </span>
        </div>
        <div class="flex justify-between items-center mt-2">
          <span class="text-sm text-slate-600">Durée</span>
          <span class="font-medium text-slate-800">30 jours</span>
        </div>
      </div>

      <div v-if="error" class="text-sm text-red-600 mb-4">{{ error }}</div>

      <BaseButton
        size="lg"
        class="w-full"
        :disabled="loading || !transaction"
        @click="$emit('paid', transaction)"
      >
        {{ loading ? "Création…" : "Payer maintenant" }}
      </BaseButton>

      <button
        class="w-full mt-3 text-sm text-slate-500 hover:text-slate-700"
        @click="emit('close')"
      >
        Annuler
      </button>
    </div>
  </div>
</template>
`;

// ==================== SponsoredBanner.vue ====================

const SPONSORED_BANNER = `<script setup>
import { onMounted, ref } from "vue";
import paymentApi from "@/services/payment";

const props = defineProps({
  placement: { type: String, default: "home_top" },
});

const banners = ref([]);
const currentIndex = ref(0);

async function load() {
  try {
    const data = await paymentApi.getBanners(props.placement);
    banners.value = data || [];
  } catch (e) {
    console.error(e);
  }
}

function next() {
  if (banners.value.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % banners.value.length;
  }
}

function handleClick(banner) {
  window.open(banner.lien_url, "_blank");
}

let interval = null;

onMounted(() => {
  load();
  interval = setInterval(next, 8000);
});
</script>

<template>
  <div v-if="banners.length" class="container-page py-3">
    <div
      class="relative rounded-xl overflow-hidden cursor-pointer"
      @click="handleClick(banners[currentIndex])"
    >
      <img
        :src="banners[currentIndex].image_url"
        :alt="banners[currentIndex].titre"
        class="w-full h-32 sm:h-40 object-cover"
      />
      <div class="absolute top-2 right-2">
        <span class="text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded">
          Sponsorisé
        </span>
      </div>
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <p class="text-white text-sm font-medium">
          {{ banners[currentIndex].titre }}
        </p>
      </div>
      <div
        v-if="banners.length > 1"
        class="absolute bottom-2 right-2 flex gap-1"
      >
        <span
          v-for="(_, i) in banners"
          :key="i"
          :class="[
            'w-1.5 h-1.5 rounded-full',
            i === currentIndex ? 'bg-white' : 'bg-white/40',
          ]"
        ></span>
      </div>
    </div>
  </div>
</template>
`;

// ==================== Fichiers ====================

const FILES = {
  "frontend/src/views/PricingView.vue": PRICING_VIEW,
  "frontend/src/components/monetization/PremiumBadge.vue": PREMIUM_BADGE,
  "frontend/src/components/monetization/UpgradeModal.vue": UPGRADE_MODAL,
  "frontend/src/components/monetization/SponsoredBanner.vue": SPONSORED_BANNER,
};

// ==================== Patch router ====================

function patchRouter() {
  const routerPath = "frontend/src/router/index.js";
  const fullPath = path.join(ROOT, routerPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${routerPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("pricing")) {
    log.info("router deja patche (pricing present)");
    return true;
  }

  // Backup
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "frontend", "src");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "router_index.js"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  // Ajoute la route "pricing" après la route "stats"
  const statsPattern = /(\{\s*path:\s*"stats"[^}]*\},)/;
  const pricingRoute = `
      {
        path: "pricing",
        name: "pricing",
        component: () => import("@/views/PricingView.vue"),
        meta: { title: "Tarifs" },
      },`;

  if (statsPattern.test(content)) {
    content = content.replace(statsPattern, `$1${pricingRoute}`);
  } else {
    log.warn("Pattern 'stats' introuvable dans le router");
    log.info("Ajoutez manuellement :");
    console.log(pricingRoute);
    return false;
  }

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(routerPath + " (patché)", "overwritten");
  return true;
}

// ==================== Patch header ====================

function patchHeader() {
  const headerPath = "frontend/src/components/layout/AppHeader.vue";
  const fullPath = path.join(ROOT, headerPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${headerPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("/pricing")) {
    log.info("header deja patche (pricing present)");
    return true;
  }

  // Backup
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "frontend", "src");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "AppHeader.vue"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  // Cherche le tableau links
  const linksPattern = /(const links = \[[^\]]*)\];/s;

  if (linksPattern.test(content)) {
    content = content.replace(linksPattern, (match, inner) => {
      // Ajoute "/pricing" avant la fermeture
      return inner.trimEnd().replace(/,\s*$/, "") + `,\n  { to: "/pricing", label: "Tarifs" },\n];`;
    });
  } else {
    log.warn("Tableau 'links' introuvable dans AppHeader");
    return false;
  }

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(headerPath + " (patché)", "overwritten");
  return true;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 14b — PAGE TARIFS");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller, ou --uninstall pour supprimer.");
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
    log.success("Module desinstalle.");
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

  log.section("Patch du router");
  patchRouter();

  log.section("Patch du header");
  patchHeader();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
      patched: ["frontend/src/router/index.js", "frontend/src/components/layout/AppHeader.vue"],
    });
  }

  log.banner("MODULE 14b — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Relancer le frontend :");
  console.log("     cd frontend && npm run dev");
  console.log("");
  console.log("  2. Ouvrir la page :");
  console.log("     http://localhost:5173/pricing");
  console.log("");
  console.log("  3. Verifier :");
  console.log("     - Les 4 tarifs s'affichent");
  console.log("     - Les moyens de paiement par pays");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});