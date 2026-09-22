#!/usr/bin/env node

/**
 * MODULE 09 — FRONTEND VUE.JS
 *
 * Crée une interface Vue 3 complète pour Job Africa.
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
};

const MODULE_ID = "09";
const MODULE_NAME = "Frontend Vue.js";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "frontend/src",
  "frontend/public",
];

// ==================== Contenu des fichiers ====================

const PACKAGE_JSON = `{
  "name": "job-africa-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 4173"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "pinia": "^2.2.4",
    "vue": "^3.5.12",
    "vue-router": "^4.4.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "vite": "^5.4.10"
  }
}
`;

const VITE_CONFIG = `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
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

const TAILWIND_CONFIG = `export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f2",
          100: "#d6ecdf",
          200: "#aed9bf",
          300: "#7dc09a",
          400: "#4fa876",
          500: "#2f8f5c",
          600: "#1f7249",
          700: "#185c3b",
          800: "#124730",
          900: "#0d3624",
        },
        accent: {
          400: "#f6b73c",
          500: "#e8a020",
          600: "#c8841a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
`;

const POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Job Africa — Trouvez les meilleures offres d'emploi en Afrique de l'Ouest."
    />
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

const ENV_EXAMPLE = `VITE_API_URL=http://127.0.0.1:8000
`;

const ENV = `VITE_API_URL=http://127.0.0.1:8000
`;

const GITIGNORE = `node_modules/
dist/
.vite/
.env
*.log
.DS_Store
.vscode/
.idea/
`;

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#2f8f5c"/>
  <path d="M20 40l10-18 10 18h-6l-4-8-4 8z" fill="#fff"/>
  <circle cx="44" cy="24" r="4" fill="#f6b73c"/>
</svg>
`;

const ROBOTS = `User-agent: *
Allow: /
`;

const MAIN_JS = `import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import "./assets/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");
`;

const APP_VUE = `<script setup>
import AppLayout from "@/components/layout/AppLayout.vue";
</script>

<template>
  <AppLayout />
</template>
`;

const MAIN_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }
  body {
    @apply bg-slate-50 text-slate-800 antialiased;
    font-family: "Inter", system-ui, sans-serif;
  }
}

@layer components {
  .container-page {
    @apply max-w-6xl mx-auto px-4 sm:px-6 lg:px-8;
  }

  .card {
    @apply bg-white rounded-xl shadow-sm border border-slate-200;
  }

  .btn {
    @apply inline-flex items-center justify-center gap-2 rounded-lg font-medium transition;
  }
}
`;

const ROUTER = `import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/HomeView.vue"),
    meta: { title: "Accueil" },
  },
  {
    path: "/jobs",
    name: "jobs",
    component: () => import("@/views/JobsView.vue"),
    meta: { title: "Offres d'emploi" },
  },
  {
    path: "/jobs/:id",
    name: "job-detail",
    component: () => import("@/views/JobDetailView.vue"),
    meta: { title: "Détail de l'offre" },
  },
  {
    path: "/stats",
    name: "stats",
    component: () => import("@/views/StatsView.vue"),
    meta: { title: "Statistiques" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/views/NotFoundView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach((to) => {
  document.title = to.meta.title
    ? \`\${to.meta.title} • Job Africa\`
    : "Job Africa";
});

export default router;
`;

const API_SERVICE = `import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    console.error("[API]", error?.response?.status, error?.message);
    return Promise.reject(error);
  }
);

export default {
  getJobs(params = {}) {
    return api.get("/jobs", { params }).then((r) => r.data);
  },
  getJob(id) {
    return api.get(\`/jobs/\${id}\`).then((r) => r.data);
  },
  getCountries() {
    return api.get("/countries").then((r) => r.data);
  },
  getCategories() {
    return api.get("/categories").then((r) => r.data);
  },
  getSources() {
    return api.get("/sources").then((r) => r.data);
  },
  getStats() {
    return api.get("/stats").then((r) => r.data);
  },
  getCompanies() {
    return api.get("/companies").then((r) => r.data);
  },
  getSkills() {
    return api.get("/skills").then((r) => r.data);
  },
};
`;

const JOBS_STORE = `import { defineStore } from "pinia";
import api from "@/services/api";

export const useJobsStore = defineStore("jobs", {
  state: () => ({
    jobs: [],
    total: 0,
    loading: false,
    error: null,
    currentJob: null,
  }),

  actions: {
    async fetchJobs(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const data = await api.getJobs(params);
        this.jobs = data.results || [];
        this.total = data.total || 0;
      } catch (e) {
        this.error = "Impossible de charger les offres.";
        this.jobs = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },

    async fetchJob(id) {
      this.loading = true;
      this.error = null;
      this.currentJob = null;
      try {
        this.currentJob = await api.getJob(id);
      } catch (e) {
        this.error = "Offre introuvable.";
      } finally {
        this.loading = false;
      }
    },
  },
});
`;

const FILTERS_STORE = `import { defineStore } from "pinia";
import api from "@/services/api";

export const useFiltersStore = defineStore("filters", {
  state: () => ({
    countries: [],
    categories: [],
    sources: [],
    loaded: false,
  }),

  actions: {
    async loadReferentials() {
      if (this.loaded) return;
      try {
        const [countries, categories, sources] = await Promise.all([
          api.getCountries(),
          api.getCategories(),
          api.getSources(),
        ]);
        this.countries = countries || [];
        this.categories = categories || [];
        this.sources = sources || [];
        this.loaded = true;
      } catch (e) {
        console.error("Referentiels non charges", e);
      }
    },
  },
});
`;

const FORMAT_UTILS = `export function timeAgo(dateString) {
  if (!dateString) return "Date inconnue";

  const date = new Date(dateString);
  if (isNaN(date)) return "Date inconnue";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "a l'instant";
  if (seconds < 3600) return \`il y a \${Math.floor(seconds / 60)} min\`;

  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return \`il y a \${hours} h\`;

  const days = Math.floor(hours / 24);
  if (days < 30) return \`il y a \${days} j\`;

  const months = Math.floor(days / 30);
  if (months < 12) return \`il y a \${months} mois\`;

  return \`il y a \${Math.floor(months / 12)} an(s)\`;
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function truncate(text, length = 180) {
  if (!text) return "";
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim();
  return clean.length > length ? clean.slice(0, length) + "…" : clean;
}

export function countryFlag(country) {
  const map = {
    Bénin: "🇧🇯", Benin: "🇧🇯",
    Togo: "🇹🇬",
    "Côte d'Ivoire": "🇨🇮",
    Sénégal: "🇸🇳", Senegal: "🇸🇳",
    "Burkina Faso": "🇧🇫",
    Mali: "🇲🇱",
    Niger: "🇳🇪",
    Guinée: "🇬🇳", Guinea: "🇬🇳",
    Ghana: "🇬🇭",
    Nigeria: "🇳🇬",
    Kenya: "🇰🇪",
    Uganda: "🇺🇬",
    "Afrique du Sud": "🇿🇦",
    Egypte: "🇪🇬",
  };
  return map[country] || "🌍";
}
`;

const CONSTANTS = `export const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "Stage",
  "Alternance",
  "Freelance",
  "Temps partiel",
  "Benevolat",
];

export const PAGE_SIZE = 12;
`;

const APP_LAYOUT = `<script setup>
import AppHeader from "./AppHeader.vue";
import AppFooter from "./AppFooter.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>
`;

const APP_HEADER = `<script setup>
import { ref } from "vue";

const open = ref(false);

const links = [
  { to: "/", label: "Accueil" },
  { to: "/jobs", label: "Offres" },
  { to: "/stats", label: "Statistiques" },
];
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-40">
    <div class="container-page flex items-center justify-between h-16">
      <RouterLink to="/" class="flex items-center gap-2">
        <span
          class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold"
        >
          JA
        </span>
        <span class="font-bold text-lg text-slate-800">Job Africa</span>
      </RouterLink>

      <nav class="hidden md:flex items-center gap-6">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="text-sm font-medium text-slate-600 hover:text-brand-600 transition"
          active-class="text-brand-600"
        >
          {{ l.label }}
        </RouterLink>
        <RouterLink
          to="/jobs"
          class="btn bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm"
        >
          Chercher une offre
        </RouterLink>
      </nav>

      <button
        class="md:hidden p-2"
        @click="open = !open"
        aria-label="Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <div v-if="open" class="md:hidden border-t border-slate-200 bg-white">
      <nav class="container-page py-4 flex flex-col gap-3">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="text-sm font-medium text-slate-700"
          @click="open = false"
        >
          {{ l.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
`;

const APP_FOOTER = `<template>
  <footer class="bg-slate-900 text-slate-300 mt-16">
    <div class="container-page py-10 grid md:grid-cols-3 gap-8">
      <div>
        <h3 class="text-white font-semibold mb-3">Job Africa</h3>
        <p class="text-sm text-slate-400">
          Agregateur intelligent d'offres d'emploi en Afrique de l'Ouest.
        </p>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Navigation</h4>
        <ul class="space-y-2 text-sm">
          <li><RouterLink to="/" class="hover:text-white">Accueil</RouterLink></li>
          <li><RouterLink to="/jobs" class="hover:text-white">Offres</RouterLink></li>
          <li><RouterLink to="/stats" class="hover:text-white">Statistiques</RouterLink></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Sources</h4>
        <p class="text-sm text-slate-400">
          Collecte automatique depuis plusieurs plateformes africaines et internationales.
        </p>
      </div>
    </div>
    <div class="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
      © {{ new Date().getFullYear() }} Job Africa — Tous droits reserves.
    </div>
  </footer>
</template>
`;

const BASE_BUTTON = `<script setup>
defineProps({
  variant: { type: String, default: "primary" },
  size: { type: String, default: "md" },
  disabled: { type: Boolean, default: false },
});

const variants = {
  primary: "bg-brand-500 hover:bg-brand-600 text-white",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800",
  outline: "border border-slate-300 hover:bg-slate-50 text-slate-700",
  ghost: "hover:bg-slate-100 text-slate-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};
</script>

<template>
  <button
    :class="[
      'btn',
      variants[variant],
      sizes[size],
      disabled && 'opacity-50 cursor-not-allowed',
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
`;

const BASE_INPUT = `<script setup>
defineProps({
  modelValue: [String, Number],
  label: String,
  placeholder: String,
  type: { type: String, default: "text" },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <label class="block">
    <span
      v-if="label"
      class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"
    >
      {{ label }}
    </span>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>
`;

const BASE_SELECT = `<script setup>
defineProps({
  modelValue: [String, Number, null],
  label: String,
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: "Tous" },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <label class="block">
    <span
      v-if="label"
      class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"
    >
      {{ label }}
    </span>
    <select
      :value="modelValue"
      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition"
      @change="$emit('update:modelValue', $event.target.value || null)"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt" :value="opt">
        {{ opt }}
      </option>
    </select>
  </label>
</template>
`;

const BASE_BADGE = `<script setup>
defineProps({
  variant: { type: String, default: "default" },
});

const variants = {
  default: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700",
  accent: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-sky-50 text-sky-700",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
      variants[variant],
    ]"
  >
    <slot />
  </span>
</template>
`;

const BASE_SPINNER = `<template>
  <div class="flex items-center justify-center py-10">
    <div
      class="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"
    ></div>
  </div>
</template>
`;

const BASE_PAGINATION = `<script setup>
import { computed } from "vue";

const props = defineProps({
  total: { type: Number, default: 0 },
  limit: { type: Number, default: 12 },
  offset: { type: Number, default: 0 },
});
const emit = defineEmits(["change"]);

const currentPage = computed(() => Math.floor(props.offset / props.limit) + 1);
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)));

function go(page) {
  if (page < 1 || page > totalPages.value) return;
  emit("change", (page - 1) * props.limit);
}

const pages = computed(() => {
  const arr = [];
  const total = totalPages.value;
  const cur = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) arr.push(i);
  } else {
    arr.push(1);
    if (cur > 3) arr.push("…");
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) {
      arr.push(i);
    }
    if (cur < total - 2) arr.push("…");
    arr.push(total);
  }
  return arr;
});
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center justify-center gap-1 mt-10">
    <button
      class="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      :disabled="currentPage === 1"
      @click="go(currentPage - 1)"
    >
      ‹ Precedent
    </button>

    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '…'" class="px-2 text-slate-400">…</span>
      <button
        v-else
        :class="[
          'px-3 py-1.5 rounded-md text-sm transition',
          p === currentPage
            ? 'bg-brand-500 text-white font-semibold'
            : 'text-slate-600 hover:bg-slate-100',
        ]"
        @click="go(p)"
      >
        {{ p }}
      </button>
    </template>

    <button
      class="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      :disabled="currentPage === totalPages"
      @click="go(currentPage + 1)"
    >
      Suivant ›
    </button>
  </div>
</template>
`;

const EMPTY_STATE = `<script setup>
defineProps({
  title: { type: String, default: "Aucun resultat" },
  description: { type: String, default: "" },
});
</script>

<template>
  <div class="text-center py-16">
    <div class="text-5xl mb-4">🔍</div>
    <h3 class="text-lg font-semibold text-slate-800">{{ title }}</h3>
    <p v-if="description" class="text-sm text-slate-500 mt-2 max-w-md mx-auto">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
`;

const JOB_CARD = `<script setup>
import BaseBadge from "@/components/ui/BaseBadge.vue";
import { timeAgo, truncate, countryFlag } from "@/utils/format";

defineProps({
  job: { type: Object, required: true },
});
</script>

<template>
  <RouterLink
    :to="\`/jobs/\${job.id}\`"
    class="card p-5 block hover:shadow-md hover:-translate-y-0.5 transition group"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <h3
          class="font-semibold text-slate-800 group-hover:text-brand-600 transition truncate"
        >
          {{ job.titre }}
        </h3>

        <p v-if="job.entreprise" class="text-sm text-slate-600 mt-1">
          {{ job.entreprise }}
        </p>

        <div class="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <BaseBadge v-if="job.pays" variant="brand">
            {{ countryFlag(job.pays) }} {{ job.pays }}
          </BaseBadge>

          <BaseBadge v-if="job.ville" variant="default">
            📍 {{ job.ville }}
          </BaseBadge>

          <BaseBadge v-if="job.type_contrat" variant="info">
            💼 {{ job.type_contrat }}
          </BaseBadge>

          <BaseBadge v-if="job.categorie" variant="accent">
            🏷️ {{ job.categorie }}
          </BaseBadge>

          <BaseBadge v-if="job.teletravail" variant="success">
            🌐 Teletravail
          </BaseBadge>
        </div>
      </div>
    </div>

    <p v-if="job.description" class="text-sm text-slate-500 mt-3 leading-relaxed">
      {{ truncate(job.description, 160) }}
    </p>

    <div
      class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400"
    >
      <span>📅 {{ timeAgo(job.date_publication || job.created_at) }}</span>
      <span class="truncate">🔗 {{ job.source }}</span>
    </div>
  </RouterLink>
</template>
`;

const JOB_LIST = `<script setup>
import JobCard from "./JobCard.vue";
import BaseSpinner from "@/components/ui/BaseSpinner.vue";
import EmptyState from "@/components/ui/EmptyState.vue";

defineProps({
  jobs: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
});
</script>

<template>
  <div>
    <BaseSpinner v-if="loading" />

    <EmptyState
      v-else-if="error"
      title="Erreur"
      :description="error"
    />

    <EmptyState
      v-else-if="!jobs.length"
      title="Aucune offre trouvee"
      description="Essayez de modifier vos criteres de recherche ou revenez plus tard."
    />

    <div v-else class="grid sm:grid-cols-2 gap-4">
      <JobCard v-for="job in jobs" :key="job.id" :job="job" />
    </div>
  </div>
</template>
`;

const JOB_SEARCH_BAR = `<script setup>
import { ref, onMounted } from "vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps({
  initialQuery: { type: String, default: "" },
});
const emit = defineEmits(["search"]);

const q = ref(props.initialQuery);

function submit() {
  emit("search", q.value.trim());
}

onMounted(() => {
  q.value = props.initialQuery;
});
</script>

<template>
  <form
    class="card p-2 flex flex-col sm:flex-row gap-2 items-stretch"
    @submit.prevent="submit"
  >
    <div class="flex-1">
      <BaseInput
        v-model="q"
        placeholder="Mot-cle : developpeur, marketing, comptable…"
      />
    </div>
    <BaseButton type="submit" size="lg">🔎 Rechercher</BaseButton>
  </form>
</template>
`;

const JOB_FILTERS = `<script setup>
import { onMounted } from "vue";
import BaseSelect from "@/components/ui/BaseSelect.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import { useFiltersStore } from "@/stores/filters";
import { CONTRACT_TYPES } from "@/utils/constants";

const props = defineProps({
  modelValue: { type: Object, required: true },
});
const emit = defineEmits(["update:modelValue", "reset"]);

const store = useFiltersStore();

onMounted(() => store.loadReferentials());

function update(field, value) {
  emit("update:modelValue", { ...props.modelValue, [field]: value });
}
</script>

<template>
  <aside class="card p-5 space-y-4 sticky top-20">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-slate-800">Filtres</h3>
      <BaseButton variant="ghost" size="sm" @click="$emit('reset')">
        Reinitialiser
      </BaseButton>
    </div>

    <BaseSelect
      label="Pays"
      :model-value="modelValue.pays"
      :options="store.countries"
      placeholder="Tous les pays"
      @update:model-value="(v) => update('pays', v)"
    />

    <BaseSelect
      label="Categorie"
      :model-value="modelValue.categorie"
      :options="store.categories"
      placeholder="Toutes"
      @update:model-value="(v) => update('categorie', v)"
    />

    <BaseSelect
      label="Type de contrat"
      :model-value="modelValue.type_contrat"
      :options="CONTRACT_TYPES"
      placeholder="Tous"
      @update:model-value="(v) => update('type_contrat', v)"
    />

    <BaseSelect
      label="Teletravail"
      :model-value="
        modelValue.teletravail === null || modelValue.teletravail === undefined
          ? ''
          : String(modelValue.teletravail)
      "
      :options="['true', 'false']"
      placeholder="Indifferent"
      @update:model-value="
        (v) => update('teletravail', v === '' ? null : v === 'true')
      "
    />

    <div class="pt-2 text-xs text-slate-400 border-t border-slate-100">
      Les filtres s'appliquent automatiquement.
    </div>
  </aside>
</template>
`;

const JOB_STATS = `<script setup>
import { onMounted, ref } from "vue";
import api from "@/services/api";

const stats = ref({ total_offres: 0 });
const loading = ref(true);

onMounted(async () => {
  try {
    stats.value = await api.getStats();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="card p-5">
      <div class="text-3xl font-bold text-brand-600">
        {{ loading ? "—" : stats.total_offres }}
      </div>
      <div class="text-sm text-slate-500 mt-1">Offres publiees</div>
    </div>
    <div class="card p-5">
      <div class="text-3xl font-bold text-brand-600">10+</div>
      <div class="text-sm text-slate-500 mt-1">Pays couverts</div>
    </div>
    <div class="card p-5">
      <div class="text-3xl font-bold text-brand-600">Multi</div>
      <div class="text-sm text-slate-500 mt-1">Sources agregees</div>
    </div>
    <div class="card p-5">
      <div class="text-3xl font-bold text-brand-600">24/7</div>
      <div class="text-sm text-slate-500 mt-1">Collecte automatique</div>
    </div>
  </div>
</template>
`;

const HOME_VIEW = `<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import JobSearchBar from "@/components/jobs/JobSearchBar.vue";
import JobList from "@/components/jobs/JobList.vue";
import JobStats from "@/components/jobs/JobStats.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import api from "@/services/api";

const router = useRouter();
const jobs = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await api.getJobs({ limit: 6 });
    jobs.value = data.results || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});

function search(q) {
  router.push({ path: "/jobs", query: q ? { q } : {} });
}
</script>

<template>
  <div>
    <section class="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
      <div class="container-page py-16 md:py-24">
        <div class="max-w-3xl">
          <h1 class="text-3xl md:text-5xl font-bold leading-tight">
            Trouvez votre prochain emploi en
            <span class="text-accent-400">Afrique de l'Ouest</span>
          </h1>
          <p class="mt-4 text-brand-50/90 text-lg">
            Des milliers d'offres agregees depuis les meilleures plateformes,
            mises a jour automatiquement.
          </p>
        </div>

        <div class="mt-8 max-w-3xl">
          <JobSearchBar @search="search" />
        </div>
      </div>
    </section>

    <section class="container-page -mt-8 relative z-10">
      <JobStats />
    </section>

    <section class="container-page py-14">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-slate-800">
            Dernieres offres publiees
          </h2>
          <p class="text-sm text-slate-500 mt-1">
            Mises a jour automatiquement toutes les 6 heures.
          </p>
        </div>
        <BaseButton variant="outline" @click="router.push('/jobs')">
          Voir toutes les offres →
        </BaseButton>
      </div>

      <JobList :jobs="jobs" :loading="loading" />
    </section>

    <section class="bg-white border-y border-slate-200">
      <div class="container-page py-14">
        <h2 class="text-2xl font-bold text-slate-800 text-center mb-10">
          Comment ca marche ?
        </h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="text-center p-6">
            <div class="text-4xl mb-3">🔎</div>
            <h3 class="font-semibold text-slate-800 mb-2">Recherchez</h3>
            <p class="text-sm text-slate-500">
              Filtrez par pays, ville, categorie, type de contrat ou teletravail.
            </p>
          </div>
          <div class="text-center p-6">
            <div class="text-4xl mb-3">📄</div>
            <h3 class="font-semibold text-slate-800 mb-2">Consultez</h3>
            <p class="text-sm text-slate-500">
              Accedez au detail complet de chaque offre et postulez en un clic.
            </p>
          </div>
          <div class="text-center p-6">
            <div class="text-4xl mb-3">🚀</div>
            <h3 class="font-semibold text-slate-800 mb-2">Postulez</h3>
            <p class="text-sm text-slate-500">
              Vous etes redirige vers la source officielle de l'offre.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
`;

const JOBS_VIEW = `<script setup>
import { reactive, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import JobSearchBar from "@/components/jobs/JobSearchBar.vue";
import JobFilters from "@/components/jobs/JobFilters.vue";
import JobList from "@/components/jobs/JobList.vue";
import BasePagination from "@/components/ui/BasePagination.vue";

import { useJobsStore } from "@/stores/jobs";
import { PAGE_SIZE } from "@/utils/constants";

const route = useRoute();
const router = useRouter();
const store = useJobsStore();
const { jobs, total, loading, error } = storeToRefs(store);

const filters = reactive({
  q: route.query.q || "",
  pays: route.query.pays || null,
  ville: route.query.ville || null,
  categorie: route.query.categorie || null,
  type_contrat: route.query.type_contrat || null,
  teletravail:
    route.query.teletravail === "true"
      ? true
      : route.query.teletravail === "false"
      ? false
      : null,
  limit: PAGE_SIZE,
  offset: 0,
});

function buildParams() {
  const p = { limit: filters.limit, offset: filters.offset };
  for (const k of ["q", "pays", "ville", "categorie", "type_contrat"]) {
    if (filters[k]) p[k] = filters[k];
  }
  if (filters.teletravail !== null) p.teletravail = filters.teletravail;
  return p;
}

async function load() {
  await store.fetchJobs(buildParams());

  const query = {};
  for (const k of ["q", "pays", "ville", "categorie", "type_contrat"]) {
    if (filters[k]) query[k] = filters[k];
  }
  if (filters.teletravail !== null) query.teletravail = String(filters.teletravail);
  router.replace({ query });
}

function onSearch(q) {
  filters.q = q;
  filters.offset = 0;
  load();
}

function onFilterChange(v) {
  Object.assign(filters, v);
  filters.offset = 0;
  load();
}

function resetFilters() {
  filters.pays = null;
  filters.ville = null;
  filters.categorie = null;
  filters.type_contrat = null;
  filters.teletravail = null;
  filters.q = "";
  filters.offset = 0;
  load();
}

function onPageChange(offset) {
  filters.offset = offset;
  load();
}

onMounted(load);

watch(
  () => route.query,
  (nq) => {
    if (nq.q !== undefined) filters.q = nq.q;
  }
);
</script>

<template>
  <div class="container-page py-8">
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-slate-800">
        Offres d'emploi
      </h1>
      <p class="text-sm text-slate-500 mt-1">
        {{ total }} offre{{ total > 1 ? "s" : "" }} disponible{{
          total > 1 ? "s" : ""
        }}
      </p>
    </div>

    <div class="mb-6">
      <JobSearchBar :initial-query="filters.q" @search="onSearch" />
    </div>

    <div class="grid md:grid-cols-[260px_1fr] gap-6">
      <JobFilters
        :model-value="filters"
        @update:model-value="onFilterChange"
        @reset="resetFilters"
      />

      <div>
        <JobList :jobs="jobs" :loading="loading" :error="error" />

        <BasePagination
          v-if="!loading && jobs.length"
          :total="total"
          :limit="filters.limit"
          :offset="filters.offset"
          @change="onPageChange"
        />
      </div>
    </div>
  </div>
</template>
`;

const JOB_DETAIL_VIEW = `<script setup>
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";

import BaseBadge from "@/components/ui/BaseBadge.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseSpinner from "@/components/ui/BaseSpinner.vue";
import EmptyState from "@/components/ui/EmptyState.vue";

import { useJobsStore } from "@/stores/jobs";
import { formatDate, timeAgo, countryFlag } from "@/utils/format";

const route = useRoute();
const store = useJobsStore();
const { currentJob: job, loading, error } = storeToRefs(store);

onMounted(() => {
  store.fetchJob(route.params.id);
});

function apply() {
  if (job.value?.url) window.open(job.value.url, "_blank");
}
</script>

<template>
  <div class="container-page py-8">
    <RouterLink
      to="/jobs"
      class="text-sm text-slate-500 hover:text-brand-600 inline-flex items-center gap-1 mb-4"
    >
      ← Retour aux offres
    </RouterLink>

    <BaseSpinner v-if="loading" />

    <EmptyState
      v-else-if="error || !job"
      title="Offre introuvable"
      :description="error || 'Cette offre n\\'existe plus.'"
    />

    <article v-else class="grid lg:grid-cols-[1fr_320px] gap-6">
      <div class="card p-6 md:p-8">
        <h1 class="text-2xl md:text-3xl font-bold text-slate-800">
          {{ job.titre }}
        </h1>

        <p v-if="job.entreprise" class="text-lg text-slate-600 mt-2">
          {{ job.entreprise }}
        </p>

        <div class="flex flex-wrap gap-2 mt-4">
          <BaseBadge v-if="job.pays" variant="brand">
            {{ countryFlag(job.pays) }} {{ job.pays }}
          </BaseBadge>
          <BaseBadge v-if="job.ville" variant="default">
            📍 {{ job.ville }}
          </BaseBadge>
          <BaseBadge v-if="job.type_contrat" variant="info">
            💼 {{ job.type_contrat }}
          </BaseBadge>
          <BaseBadge v-if="job.niveau" variant="accent">
            🎓 {{ job.niveau }}
          </BaseBadge>
          <BaseBadge v-if="job.categorie" variant="accent">
            🏷️ {{ job.categorie }}
          </BaseBadge>
          <BaseBadge v-if="job.teletravail" variant="success">
            🌐 Teletravail
          </BaseBadge>
        </div>

        <div v-if="job.resume_ia" class="mt-6 p-4 bg-brand-50 rounded-lg border border-brand-100">
          <h2 class="text-sm font-semibold text-brand-700 mb-2">
            🤖 Resume IA
          </h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            {{ job.resume_ia }}
          </p>
        </div>

        <div class="mt-6 pt-6 border-t border-slate-100">
          <h2 class="text-lg font-semibold text-slate-800 mb-3">
            Description du poste
          </h2>
          <div
            class="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-line"
          >
            {{ job.description || "Aucune description disponible." }}
          </div>
        </div>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div class="card p-5">
          <BaseButton size="lg" class="w-full" @click="apply">
            Postuler maintenant →
          </BaseButton>

          <div class="mt-4 space-y-3 text-sm">
            <div class="flex justify-between gap-2">
              <span class="text-slate-500">Source</span>
              <span class="font-medium text-slate-800 text-right">
                {{ job.source }}
              </span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-slate-500">Publiee</span>
              <span class="font-medium text-slate-800">
                {{ timeAgo(job.date_publication || job.created_at) }}
              </span>
            </div>
            <div v-if="job.date_publication" class="flex justify-between gap-2">
              <span class="text-slate-500">Date</span>
              <span class="font-medium text-slate-800">
                {{ formatDate(job.date_publication) }}
              </span>
            </div>
          </div>
        </div>

        <div class="card p-5 text-xs text-slate-500">
          💡 Astuce : verifiez toujours l'offre sur le site source avant de postuler.
        </div>
      </aside>
    </article>
  </div>
</template>
`;

const STATS_VIEW = `<script setup>
import { onMounted, ref } from "vue";
import api from "@/services/api";
import BaseSpinner from "@/components/ui/BaseSpinner.vue";

const stats = ref(null);
const countries = ref([]);
const categories = ref([]);
const sources = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const [s, c, cat, src] = await Promise.all([
      api.getStats(),
      api.getCountries(),
      api.getCategories(),
      api.getSources(),
    ]);
    stats.value = s;
    countries.value = c;
    categories.value = cat;
    sources.value = src;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container-page py-8">
    <h1 class="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
      Statistiques
    </h1>
    <p class="text-sm text-slate-500 mb-8">
      Vue d'ensemble des offres collectees par Job Africa.
    </p>

    <BaseSpinner v-if="loading" />

    <div v-else class="space-y-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card p-5">
          <div class="text-3xl font-bold text-brand-600">
            {{ stats?.total_offres || 0 }}
          </div>
          <div class="text-sm text-slate-500 mt-1">Offres totales</div>
        </div>
        <div class="card p-5">
          <div class="text-3xl font-bold text-brand-600">
            {{ countries.length }}
          </div>
          <div class="text-sm text-slate-500 mt-1">Pays</div>
        </div>
        <div class="card p-5">
          <div class="text-3xl font-bold text-brand-600">
            {{ categories.length }}
          </div>
          <div class="text-sm text-slate-500 mt-1">Categories</div>
        </div>
        <div class="card p-5">
          <div class="text-3xl font-bold text-brand-600">
            {{ sources.length }}
          </div>
          <div class="text-sm text-slate-500 mt-1">Sources</div>
        </div>
      </div>

      <section class="card p-6">
        <h2 class="font-semibold text-slate-800 mb-4">Pays couverts</h2>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="c in countries"
            :key="c"
            :to="{ path: '/jobs', query: { pays: c } }"
            class="px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-sm hover:bg-brand-100 transition"
          >
            {{ c }}
          </RouterLink>
        </div>
      </section>

      <section class="card p-6">
        <h2 class="font-semibold text-slate-800 mb-4">Categories</h2>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="c in categories"
            :key="c"
            :to="{ path: '/jobs', query: { categorie: c } }"
            class="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-sm hover:bg-amber-100 transition"
          >
            {{ c }}
          </RouterLink>
        </div>
      </section>

      <section class="card p-6">
        <h2 class="font-semibold text-slate-800 mb-4">Sources</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="s in sources"
            :key="s"
            class="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm"
          >
            {{ s }}
          </span>
        </div>
      </section>
    </div>
  </div>
</template>
`;

const NOT_FOUND_VIEW = `<script setup>
import BaseButton from "@/components/ui/BaseButton.vue";
</script>

<template>
  <div class="container-page py-24 text-center">
    <div class="text-7xl mb-6">🌍</div>
    <h1 class="text-3xl font-bold text-slate-800">Page introuvable</h1>
    <p class="text-slate-500 mt-2">
      La page que vous recherchez n'existe pas.
    </p>
    <div class="mt-6">
      <RouterLink to="/">
        <BaseButton size="lg">Retour a l'accueil</BaseButton>
      </RouterLink>
    </div>
  </div>
</template>
`;

const README = `# Job Africa — Frontend

Interface Vue 3 de consultation des offres d'emploi.

## Stack

- Vue 3 (Composition API)
- Vite
- Vue Router
- Pinia
- TailwindCSS
- Axios

## Installation

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

Le site est disponible sur http://localhost:5173

## Build production

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Fonctionnalites

- Accueil avec recherche rapide + dernieres offres
- Liste paginee avec filtres (pays, categorie, contrat, teletravail)
- Recherche par mot-cle
- Detail d'une offre avec resume IA
- Page statistiques
- Design responsive
`;

// ==================== Fichiers ====================

const FILES = {
  "frontend/package.json": PACKAGE_JSON,
  "frontend/vite.config.js": VITE_CONFIG,
  "frontend/tailwind.config.js": TAILWIND_CONFIG,
  "frontend/postcss.config.js": POSTCSS_CONFIG,
  "frontend/index.html": INDEX_HTML,
  "frontend/.env.example": ENV_EXAMPLE,
  "frontend/.env": ENV,
  "frontend/.gitignore": GITIGNORE,
  "frontend/public/favicon.svg": FAVICON,
  "frontend/public/robots.txt": ROBOTS,
  "frontend/README.md": README,
  "frontend/src/main.js": MAIN_JS,
  "frontend/src/App.vue": APP_VUE,
  "frontend/src/assets/main.css": MAIN_CSS,
  "frontend/src/router/index.js": ROUTER,
  "frontend/src/services/api.js": API_SERVICE,
  "frontend/src/stores/jobs.js": JOBS_STORE,
  "frontend/src/stores/filters.js": FILTERS_STORE,
  "frontend/src/utils/format.js": FORMAT_UTILS,
  "frontend/src/utils/constants.js": CONSTANTS,
  "frontend/src/components/layout/AppLayout.vue": APP_LAYOUT,
  "frontend/src/components/layout/AppHeader.vue": APP_HEADER,
  "frontend/src/components/layout/AppFooter.vue": APP_FOOTER,
  "frontend/src/components/ui/BaseButton.vue": BASE_BUTTON,
  "frontend/src/components/ui/BaseInput.vue": BASE_INPUT,
  "frontend/src/components/ui/BaseSelect.vue": BASE_SELECT,
  "frontend/src/components/ui/BaseBadge.vue": BASE_BADGE,
  "frontend/src/components/ui/BaseSpinner.vue": BASE_SPINNER,
  "frontend/src/components/ui/BasePagination.vue": BASE_PAGINATION,
  "frontend/src/components/ui/EmptyState.vue": EMPTY_STATE,
  "frontend/src/components/jobs/JobCard.vue": JOB_CARD,
  "frontend/src/components/jobs/JobList.vue": JOB_LIST,
  "frontend/src/components/jobs/JobSearchBar.vue": JOB_SEARCH_BAR,
  "frontend/src/components/jobs/JobFilters.vue": JOB_FILTERS,
  "frontend/src/components/jobs/JobStats.vue": JOB_STATS,
  "frontend/src/views/HomeView.vue": HOME_VIEW,
  "frontend/src/views/JobsView.vue": JOBS_VIEW,
  "frontend/src/views/JobDetailView.vue": JOB_DETAIL_VIEW,
  "frontend/src/views/StatsView.vue": STATS_VIEW,
  "frontend/src/views/NotFoundView.vue": NOT_FOUND_VIEW,
};

// ==================== Main ====================

async function main() {
  log.banner("MODULE 09 — FRONTEND VUE.JS");

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
    log.banner("MODULE 09 — DESINSTALLE");
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

  log.banner("MODULE 09 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  ───────────────────────────────────────");
  console.log("");
  console.log("  1. Aller dans le dossier frontend :");
  console.log("     cd frontend");
  console.log("");
  console.log("  2. Installer les dependances :");
  console.log("     npm install");
  console.log("");
  console.log("  3. Verifier que le backend tourne :");
  console.log("     (dans un autre terminal) uvicorn app.main:app --reload --reload-dir app");
  console.log("");
  console.log("  4. Lancer le frontend :");
  console.log("     npm run dev");
  console.log("");
  console.log("  5. Ouvrir :");
  console.log("     http://localhost:5173");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  process.exit(1);
});
