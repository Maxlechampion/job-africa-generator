#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 10b — PWA (Progressive Web App)
 * ═══════════════════════════════════════════════════════════════
 *
 * Transforme le frontend Vue en PWA installable (Android + iOS).
 *
 * USAGE :
 *   node 10b-pwa.js [options]
 *
 * PRÉREQUIS :
 *   - Modules 00, 09 (Frontend Vue) installés
 *   - Module 15 (Push) installé (sw-push.js existant)
 *
 * DÉPENDANCE FRONTEND :
 *   - vite-plugin-pwa (npm install -D vite-plugin-pwa)
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

const MODULE_ID = "10b";
const MODULE_NAME = "PWA";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "frontend/vite.config.js",
  "frontend/index.html",
  "frontend/src/main.js",
  "frontend/src/App.vue",
];

// ==================== vite.config.js (modifié) ====================

const VITE_CONFIG = `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      includeAssets: ["favicon.svg", "robots.txt", "icons/*.png"],

      manifest: {
        name: "Job Africa — Offres d'emploi en Afrique",
        short_name: "Job Africa",
        description:
          "Trouvez les meilleures offres d'emploi en Afrique de l'Ouest.",
        lang: "fr",
        dir: "ltr",
        theme_color: "#2f8f5c",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["business", "productivity", "education"],

        icons: [
          {
            src: "icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],

        shortcuts: [
          {
            name: "Rechercher une offre",
            short_name: "Rechercher",
            url: "/jobs",
            icons: [
              {
                src: "icons/pwa-192x192.png",
                sizes: "192x192",
              },
            ],
          },
          {
            name: "Mon compte",
            short_name: "Compte",
            url: "/account",
            icons: [
              {
                src: "icons/pwa-192x192.png",
                sizes: "192x192",
              },
            ],
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        runtimeCaching: [
          {
            urlPattern: /^https:\\/\\/job-africa-generator\\.onrender\\.com\\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\\/\\/fonts\\.googleapis\\.com\\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\\/\\/fonts\\.gstatic\\.com\\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\\/api/, ""),
      },
    },
  },
});
`;

// ==================== index.html (modifié) ====================

const INDEX_HTML = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta
      name="description"
      content="Job Africa — Trouvez les meilleures offres d'emploi en Afrique de l'Ouest."
    />

    <!-- ==================== PWA ==================== -->
    <meta name="theme-color" content="#2f8f5c" />
    <meta name="color-scheme" content="light" />

    <!-- iOS -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Job Africa" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

    <!-- Android -->
    <meta name="mobile-web-app-capable" content="yes" />

    <title>Job Africa — Offres d'emploi en Afrique</title>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;

// ==================== main.js (modifié) ====================

const MAIN_JS = `import { createApp } from "vue";
import { createPinia } from "pinia";
import { registerSW } from "virtual:pwa-register";

import App from "./App.vue";
import router from "./router";
import { i18n } from "./i18n";
import { useAuthStore } from "@/stores/auth";
import "./assets/main.css";

// ==================== PWA : Service Worker ====================
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("pwa:update-available"));
  },
  onOfflineReady() {
    console.log("✅ PWA prête pour le mode hors-ligne");
  },
  onRegistered(registration) {
    console.log("✅ Service Worker enregistré");
    if (registration) {
      setInterval(() => registration.update(), 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error("❌ Erreur Service Worker :", error);
  },
});

// ==================== Vue ====================
const app = createApp(App);

app.use(createPinia());
app.use(i18n);
app.use(router);

const auth = useAuthStore();
auth.init().finally(() => app.mount("#app"));

window.__updateSW = updateSW;
`;

// ==================== App.vue (modifié) ====================

const APP_VUE = `<script setup>
import AppLayout from "@/components/layout/AppLayout.vue";
import PushPrompt from "@/components/pwa/PushPrompt.vue";
import InstallPrompt from "@/components/pwa/InstallPrompt.vue";
import UpdatePrompt from "@/components/pwa/UpdatePrompt.vue";
import OfflineIndicator from "@/components/pwa/OfflineIndicator.vue";
</script>

<template>
  <div>
    <OfflineIndicator />
    <AppLayout />
    <InstallPrompt />
    <UpdatePrompt />
    <PushPrompt />
  </div>
</template>
`;

// ==================== InstallPrompt.vue ====================

const INSTALL_PROMPT = `<script setup>
import { ref, onMounted, computed } from "vue";

const deferredPrompt = ref(null);
const showPrompt = ref(false);
const platform = ref("other");
const dismissed = ref(false);

const isIOS = computed(() => platform.value === "ios");
const isAndroid = computed(() => platform.value === "android");

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

async function install() {
  if (!deferredPrompt.value) return;
  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  console.log("Installation :", outcome);
  deferredPrompt.value = null;
  showPrompt.value = false;
}

function dismiss() {
  dismissed.value = true;
  showPrompt.value = false;
  localStorage.setItem("pwa-install-dismissed", Date.now().toString());
}

onMounted(() => {
  platform.value = detectPlatform();

  if (isStandalone()) return;

  const lastDismiss = localStorage.getItem("pwa-install-dismissed");
  if (lastDismiss) {
    const days = (Date.now() - parseInt(lastDismiss)) / (1000 * 60 * 60 * 24);
    if (days < 7) return;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showPrompt.value = true;
  });

  if (isIOS.value) {
    setTimeout(() => {
      showPrompt.value = true;
    }, 3000);
  }
});
</script>

<template>
  <div
    v-if="showPrompt && isAndroid && deferredPrompt"
    class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 card p-4 shadow-lg border-brand-200"
  >
    <div class="flex items-start gap-3">
      <div class="text-3xl">📱</div>
      <div class="flex-1">
        <div class="font-semibold text-slate-800">Installer Job Africa</div>
        <p class="text-xs text-slate-500 mt-1">
          Ajoutez l'application à votre écran d'accueil pour un accès rapide.
        </p>
        <div class="flex gap-2 mt-3">
          <button
            class="btn bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 text-sm"
            @click="install"
          >
            Installer
          </button>
          <button class="text-xs text-slate-500 hover:text-slate-700 px-2" @click="dismiss">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showPrompt && isIOS && !dismissed"
    class="fixed bottom-4 left-4 right-4 z-50 card p-4 shadow-lg border-brand-200"
  >
    <div class="flex items-start gap-3">
      <div class="text-3xl">📱</div>
      <div class="flex-1">
        <div class="font-semibold text-slate-800">Installer sur iPhone</div>
        <ol class="text-xs text-slate-600 mt-2 space-y-1.5 list-decimal list-inside">
          <li>Appuyez sur <strong>Partager</strong> ⬆️ en bas</li>
          <li>Choisissez <strong>Sur l'écran d'accueil</strong></li>
          <li>Appuyez sur <strong>Ajouter</strong></li>
        </ol>
        <div class="flex gap-2 mt-3">
          <button class="text-xs text-slate-500 hover:text-slate-700" @click="dismiss">
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
`;

// ==================== UpdatePrompt.vue ====================

const UPDATE_PROMPT = `<script setup>
import { ref, onMounted } from "vue";

const showUpdate = ref(false);
const updating = ref(false);

function handleUpdate() {
  showUpdate.value = true;
}

async function applyUpdate() {
  updating.value = true;
  if (typeof window.__updateSW === "function") {
    await window.__updateSW(true);
  } else {
    window.location.reload();
  }
}

function dismiss() {
  showUpdate.value = false;
}

onMounted(() => {
  window.addEventListener("pwa:update-available", handleUpdate);
});
</script>

<template>
  <div
    v-if="showUpdate"
    class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 card p-4 shadow-lg border-amber-200 bg-amber-50"
  >
    <div class="flex items-start gap-3">
      <div class="text-2xl">🔄</div>
      <div class="flex-1">
        <div class="font-semibold text-slate-800 text-sm">Mise à jour disponible</div>
        <p class="text-xs text-slate-600 mt-1">
          Une nouvelle version de Job Africa est prête.
        </p>
        <div class="flex gap-2 mt-3">
          <button
            class="btn bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 text-xs"
            :disabled="updating"
            @click="applyUpdate"
          >
            {{ updating ? "Mise à jour…" : "Mettre à jour" }}
          </button>
          <button class="text-xs text-slate-500 hover:text-slate-700 px-2" @click="dismiss">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
`;

// ==================== OfflineIndicator.vue ====================

const OFFLINE_INDICATOR = `<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const isOnline = ref(navigator.onLine);

function updateStatus() {
  isOnline.value = navigator.onLine;
}

onMounted(() => {
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
});

onUnmounted(() => {
  window.removeEventListener("online", updateStatus);
  window.removeEventListener("offline", updateStatus);
});
</script>

<template>
  <Transition name="fade">
    <div
      v-if="!isOnline"
      class="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-xs py-2 px-4"
    >
      📡 Vous êtes hors-ligne — affichage des données en cache
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
`;

// ==================== robots.txt ====================

const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: https://frontend-zeta-six-12mzm0ovel.vercel.app/sitemap.xml
`;

// ==================== Fichiers ====================

const FILES = {
  "frontend/vite.config.js": VITE_CONFIG,
  "frontend/index.html": INDEX_HTML,
  "frontend/src/main.js": MAIN_JS,
  "frontend/src/App.vue": APP_VUE,
  "frontend/src/components/pwa/InstallPrompt.vue": INSTALL_PROMPT,
  "frontend/src/components/pwa/UpdatePrompt.vue": UPDATE_PROMPT,
  "frontend/src/components/pwa/OfflineIndicator.vue": OFFLINE_INDICATOR,
  "frontend/public/robots.txt": ROBOTS_TXT,
};

// ==================== Main ====================

async function main() {
  log.banner("MODULE 10b — PWA");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
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

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 10b — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  DEPENDANCE FRONTEND A INSTALLER :");
  console.log("    cd frontend");
  console.log("    npm install -D vite-plugin-pwa");
  console.log("");
  console.log("  ICONES PWA A CREER (dans frontend/public/icons/) :");
  console.log("    - pwa-192x192.png");
  console.log("    - pwa-512x512.png");
  console.log("    - pwa-maskable-512x512.png");
  console.log("    - apple-touch-icon.png");
  console.log("");
  console.log("  Utiliser : https://realfavicongenerator.net");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. npm install -D vite-plugin-pwa");
  console.log("  2. Ajouter les icones PWA dans public/icons/");
  console.log("  3. npm run build");
  console.log("  4. Tester en local : npm run preview");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});