#!/usr/bin/env node

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

const MODULE_ID = "15d";
const MODULE_NAME = "Payment Toast";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "frontend/src/App.vue",
  "frontend/src/components/jobs/BoostButton.vue",
];

// ==================== stores/toast.js ====================

const TOAST_STORE = [
  'import { defineStore } from "pinia";',
  '',
  'export const useToastStore = defineStore("toast", {',
  '  state: () => ({',
  '    toasts: [],',
  '    nextId: 1,',
  '  }),',
  '',
  '  actions: {',
  '    add({ type = "info", title, message, duration = 5000, actions = [], data = null }) {',
  '      const id = this.nextId++;',
  '      this.toasts.push({ id, type, title, message, actions, data, createdAt: Date.now() });',
  '      if (duration > 0) {',
  '        setTimeout(() => this.remove(id), duration);',
  '      }',
  '      return id;',
  '    },',
  '',
  '    remove(id) {',
  '      const index = this.toasts.findIndex((t) => t.id === id);',
  '      if (index !== -1) this.toasts.splice(index, 1);',
  '    },',
  '',
  '    success(title, message, options = {}) {',
  '      return this.add({ type: "success", title, message, ...options });',
  '    },',
  '',
  '    error(title, message, options = {}) {',
  '      return this.add({ type: "error", title, message, ...options });',
  '    },',
  '',
  '    info(title, message, options = {}) {',
  '      return this.add({ type: "info", title, message, ...options });',
  '    },',
  '',
  '    warning(title, message, options = {}) {',
  '      return this.add({ type: "warning", title, message, ...options });',
  '    },',
  '',
  '    payment(reference, montant, devise = "FCFA") {',
  '      return this.add({',
  '        type: "payment",',
  '        title: "Transaction créée",',
  '        message: "Votre offre sera boostée dès confirmation du paiement.",',
  '        duration: 10000,',
  '        data: { reference, montant, devise },',
  '        actions: [',
  '          {',
  '            label: "Copier la référence",',
  '            primary: false,',
  '            handler: () => {',
  '              navigator.clipboard.writeText(reference);',
  '            },',
  '          },',
  '          {',
  '            label: "Compris",',
  '            primary: true,',
  '            dismiss: true,',
  '          },',
  '        ],',
  '      });',
  '    },',
  '  },',
  '});',
  '',
].join("\n");

// ==================== components/ui/ToastContainer.vue ====================

const TOAST_CONTAINER = [
  '<script setup>',
  'import { computed } from "vue";',
  'import { useToastStore } from "@/stores/toast";',
  '',
  'const store = useToastStore();',
  'const toasts = computed(() => store.toasts);',
  '',
  'const styles = {',
  '  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "✅", title: "text-emerald-900", text: "text-emerald-700" },',
  '  error:   { bg: "bg-red-50",     border: "border-red-200",     icon: "❌", title: "text-red-900",     text: "text-red-700" },',
  '  warning: { bg: "bg-amber-50",   border: "border-amber-200",   icon: "⚠️", title: "text-amber-900",   text: "text-amber-700" },',
  '  info:    { bg: "bg-sky-50",     border: "border-sky-200",     icon: "ℹ️", title: "text-sky-900",     text: "text-sky-700" },',
  '  payment: { bg: "bg-brand-50",   border: "border-brand-200",   icon: "💳", title: "text-brand-900",   text: "text-brand-700" },',
  '};',
  '',
  'function getStyle(type) {',
  '  return styles[type] || styles.info;',
  '}',
  '',
  'function handleAction(toast, action) {',
  '  if (action.handler) action.handler();',
  '  if (action.dismiss) store.remove(toast.id);',
  '}',
  '</script>',
  '',
  '<template>',
  '  <div',
  '    class="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none"',
  '    style="max-width: 420px; width: calc(100% - 2rem)"',
  '  >',
  '    <TransitionGroup',
  '      enter-active-class="transition duration-300 ease-out"',
  '      enter-from-class="transform translate-x-full opacity-0"',
  '      enter-to-class="transform translate-x-0 opacity-100"',
  '      leave-active-class="transition duration-200 ease-in"',
  '      leave-from-class="transform translate-x-0 opacity-100"',
  '      leave-to-class="transform translate-x-full opacity-0"',
  '    >',
  '      <div',
  '        v-for="toast in toasts"',
  '        :key="toast.id"',
  '        :class="[',
  '          \'card p-4 shadow-lg border pointer-events-auto\',',
  '          getStyle(toast.type).bg,',
  '          getStyle(toast.type).border,',
  '        ]"',
  '      >',
  '        <div class="flex items-start gap-3">',
  '          <div class="text-2xl flex-shrink-0">',
  '            {{ getStyle(toast.type).icon }}',
  '          </div>',
  '',
  '          <div class="flex-1 min-w-0">',
  '            <h4 :class="[\'font-semibold text-sm\', getStyle(toast.type).title]">',
  '              {{ toast.title }}',
  '            </h4>',
  '',
  '            <p',
  '              v-if="!toast.data"',
  '              :class="[\'text-xs mt-1\', getStyle(toast.type).text]"',
  '            >',
  '              {{ toast.message }}',
  '            </p>',
  '',
  '            <div v-else class="mt-2 space-y-1">',
  '              <div :class="[\'flex items-center justify-between text-xs\', getStyle(toast.type).text]">',
  '                <span>Référence</span>',
  '                <code class="font-mono font-semibold px-2 py-0.5 rounded bg-white/60">',
  '                  {{ toast.data.reference }}',
  '                </code>',
  '              </div>',
  '              <div :class="[\'flex items-center justify-between text-xs\', getStyle(toast.type).text]">',
  '                <span>Montant</span>',
  '                <span class="font-semibold">',
  '                  {{ toast.data.montant }} {{ toast.data.devise }}',
  '                </span>',
  '              </div>',
  '              <p :class="[\'text-xs mt-2 leading-relaxed\', getStyle(toast.type).text]">',
  '                {{ toast.message }}',
  '              </p>',
  '            </div>',
  '          </div>',
  '',
  '          <button',
  '            class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/60 flex-shrink-0"',
  '            @click="store.remove(toast.id)"',
  '          >',
  '            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">',
  '              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />',
  '            </svg>',
  '          </button>',
  '        </div>',
  '',
  '        <div',
  '          v-if="toast.actions && toast.actions.length > 0"',
  '          class="flex gap-2 mt-3 pl-9"',
  '        >',
  '          <button',
  '            v-for="(action, i) in toast.actions"',
  '            :key="i"',
  '            :class="[',
  '              \'text-xs px-3 py-1.5 rounded-lg font-medium transition\',',
  '              action.primary',
  '                ? \'bg-brand-500 hover:bg-brand-600 text-white\'',
  '                : \'bg-white/70 hover:bg-white text-slate-700 border border-slate-200\',',
  '            ]"',
  '            @click="handleAction(toast, action)"',
  '          >',
  '            {{ action.label }}',
  '          </button>',
  '        </div>',
  '      </div>',
  '    </TransitionGroup>',
  '  </div>',
  '</template>',
  '',
].join("\n");

// ==================== Fichiers ====================

const FILES = {
  "frontend/src/stores/toast.js": TOAST_STORE,
  "frontend/src/components/ui/ToastContainer.vue": TOAST_CONTAINER,
};

// ==================== Patch App.vue ====================

function patchAppVue() {
  const appPath = "frontend/src/App.vue";
  const fullPath = path.join(ROOT, appPath);

  if (!fs.existsSync(fullPath)) {
    log.error("Fichier " + appPath + " introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("ToastContainer")) {
    log.info("App.vue deja patche");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "frontend", "src");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "App.vue"));
  } catch (e) {
    log.warn("Backup impossible : " + e.message);
  }

  // Ajouter l'import
  content = content.replace(
    /(<script setup>)([\s\S]*?)(<\/script>)/,
    function (match, open, inner, close) {
      if (inner.includes("ToastContainer")) return match;
      var newImport = '\nimport ToastContainer from "@/components/ui/ToastContainer.vue";\n';
      return open + inner + newImport + close;
    }
  );

  // Ajouter le composant dans le template
  content = content.replace(
    /(<\/div>\s*<\/template>)/,
    "  <ToastContainer />\n$1"
  );

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(appPath + " (patché)", "overwritten");
  return true;
}

// ==================== Patch BoostButton.vue ====================

function patchBoostButton() {
  const buttonPath = "frontend/src/components/jobs/BoostButton.vue";
  const fullPath = path.join(ROOT, buttonPath);

  if (!fs.existsSync(fullPath)) {
    log.error("Fichier " + buttonPath + " introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("useToastStore")) {
    log.info("BoostButton.vue deja patche");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "frontend", "src");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "BoostButton.vue"));
  } catch (e) {
    log.warn("Backup impossible : " + e.message);
  }

  // Ajouter l'import du store toast
  content = content.replace(
    /import paymentApi from "@\/services\/payment";/,
    'import paymentApi from "@/services/payment";\nimport { useToastStore } from "@/stores/toast";'
  );

  // Ajouter l'instance du store
  content = content.replace(
    /const auth = useAuthStore\(\);/,
    'const auth = useAuthStore();\nconst toast = useToastStore();'
  );

  // Remplacer alert par toast.payment
  content = content.replace(
    /alert\(\s*message\s*\);?/g,
    'toast.payment(result.reference, result.montant, result.devise);'
  );

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(buttonPath + " (patché)", "overwritten");
  return true;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 15d — PAYMENT TOAST");

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

  log.section("Creation de " + Object.keys(FILES).length + " fichiers");

  const results = writeFiles(FILES, {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    "-> " + results.created + " cree(s), " + results.overwritten + " ecrase(s), " + results.skipped + " ignore(s)"
  );

  log.section("Patch de App.vue");
  patchAppVue();

  log.section("Patch de BoostButton.vue");
  patchBoostButton();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
      patched: [
        "frontend/src/App.vue",
        "frontend/src/components/jobs/BoostButton.vue",
      ],
    });
  }

  log.banner("MODULE 15d — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Modifications :");
  console.log("  - ToastContainer.vue (nouveau)");
  console.log("  - toast.js (store Pinia)");
  console.log("  - App.vue (ajout ToastContainer)");
  console.log("  - BoostButton.vue (toast au lieu d'alert)");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});