#!/usr/bin/env node

/**
 * MODULE 12 — MULTI-LANGUE FR/EN
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

const MODULE_ID = "12";
const MODULE_NAME = "Multi-langue FR/EN";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "frontend/src/main.js",
  "frontend/src/router/index.js",
];

// ==================== FRONTEND ====================

const LOCALE_FR = `{
  "common": {
    "app_name": "Job Africa",
    "loading": "Chargement…",
    "search": "Rechercher",
    "search_placeholder": "Mot-clé : développeur, marketing…",
    "all": "Tous",
    "all_countries": "Tous les pays",
    "all_categories": "Toutes",
    "all_contracts": "Tous",
    "reset": "Réinitialiser",
    "cancel": "Annuler",
    "save": "Enregistrer",
    "delete": "Supprimer",
    "edit": "Modifier",
    "close": "Fermer",
    "back": "Retour",
    "next": "Suivant",
    "previous": "Précédent",
    "yes": "Oui",
    "no": "Non",
    "email": "Email",
    "password": "Mot de passe",
    "optional": "optionnel",
    "required": "requis",
    "share": "Partager",
    "copy": "Copier",
    "copied": "Copié !"
  },
  "nav": {
    "home": "Accueil",
    "jobs": "Offres",
    "stats": "Statistiques",
    "match": "Matching IA",
    "login": "Connexion",
    "signup": "S'inscrire",
    "logout": "Déconnexion",
    "account": "Mon compte",
    "favorites": "Mes favoris",
    "alerts": "Mes alertes",
    "admin": "Admin"
  },
  "home": {
    "hero_title": "Trouvez votre prochain emploi en",
    "hero_highlight": "Afrique de l'Ouest",
    "hero_subtitle": "Des milliers d'offres agrégées depuis les meilleures plateformes, mises à jour automatiquement.",
    "latest_jobs": "Dernières offres publiées",
    "latest_jobs_subtitle": "Mises à jour automatiquement toutes les 6 heures.",
    "view_all": "Voir toutes les offres",
    "how_it_works": "Comment ça marche ?",
    "step1_title": "Recherchez",
    "step1_desc": "Filtrez par pays, ville, catégorie, type de contrat ou télétravail.",
    "step2_title": "Consultez",
    "step2_desc": "Accédez au détail complet de chaque offre et postulez en un clic.",
    "step3_title": "Postulez",
    "step3_desc": "Vous êtes redirigé vers la source officielle de l'offre."
  },
  "jobs": {
    "title": "Offres d'emploi",
    "count_one": "{count} offre disponible",
    "count_other": "{count} offres disponibles",
    "filters": "Filtres",
    "country": "Pays",
    "city": "Ville",
    "category": "Catégorie",
    "contract": "Type de contrat",
    "remote": "Télétravail",
    "remote_yes": "Oui",
    "remote_no": "Non",
    "remote_any": "Indifférent",
    "no_results": "Aucune offre trouvée",
    "no_results_desc": "Essayez de modifier vos critères de recherche ou revenez plus tard.",
    "published": "Publiée",
    "source": "Source",
    "apply": "Postuler maintenant",
    "back_to_jobs": "Retour aux offres",
    "description": "Description du poste",
    "no_description": "Aucune description disponible.",
    "ai_summary": "Résumé IA",
    "tip": "Astuce : vérifiez toujours l'offre sur le site source avant de postuler."
  },
  "match": {
    "title": "Matching IA",
    "subtitle": "Collez votre CV ou vos compétences, l'IA trouve les offres les plus pertinentes.",
    "placeholder": "Ex : Développeur Python junior, maîtrise Django, PostgreSQL, Docker…",
    "find": "Trouver les offres",
    "searching": "Recherche…"
  },
  "stats": {
    "title": "Statistiques",
    "subtitle": "Vue d'ensemble des offres collectées par Job Africa.",
    "total_jobs": "Offres totales",
    "countries": "Pays",
    "categories": "Catégories",
    "sources": "Sources",
    "countries_covered": "Pays couverts",
    "categories_label": "Catégories",
    "sources_label": "Sources"
  },
  "auth": {
    "login_title": "Connexion",
    "login_subtitle": "Accédez à vos favoris et alertes.",
    "signup_title": "Inscription",
    "signup_subtitle": "Créez votre compte gratuitement.",
    "reset_title": "Mot de passe oublié",
    "reset_subtitle": "Recevez un lien de réinitialisation.",
    "new_password_title": "Nouveau mot de passe",
    "email": "Email",
    "email_placeholder": "vous@exemple.com",
    "password": "Mot de passe",
    "password_placeholder": "8 caractères minimum",
    "name": "Nom",
    "name_optional": "Nom (optionnel)",
    "login_button": "Se connecter",
    "signup_button": "Créer mon compte",
    "reset_button": "Envoyer le lien",
    "update_button": "Mettre à jour",
    "forgot_password": "Mot de passe oublié ?",
    "no_account": "Pas de compte ?",
    "have_account": "Déjà un compte ?",
    "signup_link": "S'inscrire",
    "login_link": "Se connecter",
    "verify_email_title": "Vérifiez votre email",
    "verify_email_desc": "Un lien de confirmation a été envoyé à {email}.",
    "reset_sent_title": "Email envoyé",
    "reset_sent_desc": "Consultez votre boîte mail pour réinitialiser votre mot de passe."
  },
  "account": {
    "title": "Mon compte",
    "role": "Rôle",
    "admin": "Admin",
    "user": "Utilisateur",
    "change_password": "Changer le mot de passe",
    "logout": "Se déconnecter",
    "my_favorites": "Mes favoris",
    "my_alerts": "Mes alertes"
  },
  "admin": {
    "title": "Dashboard Admin",
    "subtitle": "Vue d'ensemble de la plateforme Job Africa",
    "refresh": "Actualiser",
    "trigger_collect": "Lancer une collecte",
    "kpi_total_jobs": "Offres totales",
    "kpi_jobs_7d": "Offres 7 jours",
    "kpi_active_sources": "Sources actives",
    "kpi_skills": "Compétences",
    "kpi_companies": "Entreprises",
    "kpi_jobs_30d": "Offres 30 jours",
    "chart_title": "Offres collectées (30 derniers jours)",
    "top_skills": "Top compétences",
    "top_countries": "Top pays",
    "sources": "Sources",
    "logs": "Dernières collectes",
    "no_data": "Aucune donnée."
  },
  "footer": {
    "tagline": "Agrégateur intelligent d'offres d'emploi en Afrique de l'Ouest.",
    "navigation": "Navigation",
    "sources": "Sources",
    "sources_desc": "Collecte automatique depuis plusieurs plateformes africaines et internationales.",
    "rights": "© {year} Job Africa — Tous droits réservés."
  },
  "time": {
    "just_now": "à l'instant",
    "minutes_ago": "il y a {n} min",
    "hours_ago": "il y a {n} h",
    "days_ago": "il y a {n} j",
    "months_ago": "il y a {n} mois",
    "years_ago": "il y a {n} an(s)",
    "unknown": "Date inconnue"
  },
  "errors": {
    "not_found": "Page introuvable",
    "not_found_desc": "La page que vous recherchez n'existe pas.",
    "back_home": "Retour à l'accueil",
    "generic": "Une erreur est survenue",
    "unauthorized": "Authentification requise",
    "forbidden": "Accès refusé"
  }
}
`;

const LOCALE_EN = `{
  "common": {
    "app_name": "Job Africa",
    "loading": "Loading…",
    "search": "Search",
    "search_placeholder": "Keyword: developer, marketing…",
    "all": "All",
    "all_countries": "All countries",
    "all_categories": "All",
    "all_contracts": "All",
    "reset": "Reset",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "yes": "Yes",
    "no": "No",
    "email": "Email",
    "password": "Password",
    "optional": "optional",
    "required": "required",
    "share": "Share",
    "copy": "Copy",
    "copied": "Copied!"
  },
  "nav": {
    "home": "Home",
    "jobs": "Jobs",
    "stats": "Statistics",
    "match": "AI Matching",
    "login": "Log in",
    "signup": "Sign up",
    "logout": "Log out",
    "account": "My account",
    "favorites": "My favorites",
    "alerts": "My alerts",
    "admin": "Admin"
  },
  "home": {
    "hero_title": "Find your next job in",
    "hero_highlight": "West Africa",
    "hero_subtitle": "Thousands of offers aggregated from the best platforms, updated automatically.",
    "latest_jobs": "Latest job offers",
    "latest_jobs_subtitle": "Automatically updated every 6 hours.",
    "view_all": "View all offers",
    "how_it_works": "How it works",
    "step1_title": "Search",
    "step1_desc": "Filter by country, city, category, contract type or remote.",
    "step2_title": "Browse",
    "step2_desc": "Access the full details of each offer and apply in one click.",
    "step3_title": "Apply",
    "step3_desc": "You are redirected to the official source of the offer."
  },
  "jobs": {
    "title": "Job offers",
    "count_one": "{count} offer available",
    "count_other": "{count} offers available",
    "filters": "Filters",
    "country": "Country",
    "city": "City",
    "category": "Category",
    "contract": "Contract type",
    "remote": "Remote",
    "remote_yes": "Yes",
    "remote_no": "No",
    "remote_any": "Any",
    "no_results": "No offer found",
    "no_results_desc": "Try changing your search criteria or come back later.",
    "published": "Published",
    "source": "Source",
    "apply": "Apply now",
    "back_to_jobs": "Back to offers",
    "description": "Job description",
    "no_description": "No description available.",
    "ai_summary": "AI Summary",
    "tip": "Tip: always verify the offer on the source website before applying."
  },
  "match": {
    "title": "AI Matching",
    "subtitle": "Paste your CV or skills, the AI finds the most relevant offers.",
    "placeholder": "E.g.: Junior Python developer, skilled in Django, PostgreSQL, Docker…",
    "find": "Find offers",
    "searching": "Searching…"
  },
  "stats": {
    "title": "Statistics",
    "subtitle": "Overview of offers collected by Job Africa.",
    "total_jobs": "Total offers",
    "countries": "Countries",
    "categories": "Categories",
    "sources": "Sources",
    "countries_covered": "Countries covered",
    "categories_label": "Categories",
    "sources_label": "Sources"
  },
  "auth": {
    "login_title": "Log in",
    "login_subtitle": "Access your favorites and alerts.",
    "signup_title": "Sign up",
    "signup_subtitle": "Create your free account.",
    "reset_title": "Forgot password",
    "reset_subtitle": "Receive a reset link.",
    "new_password_title": "New password",
    "email": "Email",
    "email_placeholder": "you@example.com",
    "password": "Password",
    "password_placeholder": "8 characters minimum",
    "name": "Name",
    "name_optional": "Name (optional)",
    "login_button": "Log in",
    "signup_button": "Create my account",
    "reset_button": "Send link",
    "update_button": "Update",
    "forgot_password": "Forgot password?",
    "no_account": "No account?",
    "have_account": "Already have an account?",
    "signup_link": "Sign up",
    "login_link": "Log in",
    "verify_email_title": "Verify your email",
    "verify_email_desc": "A confirmation link has been sent to {email}.",
    "reset_sent_title": "Email sent",
    "reset_sent_desc": "Check your inbox to reset your password."
  },
  "account": {
    "title": "My account",
    "role": "Role",
    "admin": "Admin",
    "user": "User",
    "change_password": "Change password",
    "logout": "Log out",
    "my_favorites": "My favorites",
    "my_alerts": "My alerts"
  },
  "admin": {
    "title": "Admin Dashboard",
    "subtitle": "Overview of the Job Africa platform",
    "refresh": "Refresh",
    "trigger_collect": "Run a collection",
    "kpi_total_jobs": "Total offers",
    "kpi_jobs_7d": "Offers 7 days",
    "kpi_active_sources": "Active sources",
    "kpi_skills": "Skills",
    "kpi_companies": "Companies",
    "kpi_jobs_30d": "Offers 30 days",
    "chart_title": "Offers collected (last 30 days)",
    "top_skills": "Top skills",
    "top_countries": "Top countries",
    "sources": "Sources",
    "logs": "Latest collections",
    "no_data": "No data."
  },
  "footer": {
    "tagline": "Smart job aggregator for West Africa.",
    "navigation": "Navigation",
    "sources": "Sources",
    "sources_desc": "Automatic collection from several African and international platforms.",
    "rights": "© {year} Job Africa — All rights reserved."
  },
  "time": {
    "just_now": "just now",
    "minutes_ago": "{n} min ago",
    "hours_ago": "{n} h ago",
    "days_ago": "{n} d ago",
    "months_ago": "{n} months ago",
    "years_ago": "{n} year(s) ago",
    "unknown": "Unknown date"
  },
  "errors": {
    "not_found": "Page not found",
    "not_found_desc": "The page you are looking for does not exist.",
    "back_home": "Back to home",
    "generic": "An error occurred",
    "unauthorized": "Authentication required",
    "forbidden": "Access denied"
  }
}
`;

const I18N_INDEX = `import { createI18n } from "vue-i18n";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

const STORAGE_KEY = "jobafrica-lang";

function detectLocale() {
  // 1. Choix sauvegarde
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "fr" || saved === "en") return saved;

  // 2. Navigateur
  const nav = navigator.language?.toLowerCase() || "";
  if (nav.startsWith("en")) return "en";

  // 3. Par defaut
  return "fr";
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: "fr",
  messages: { fr, en },
  datetimeFormats: {
    fr: {
      short: { year: "numeric", month: "short", day: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric" },
    },
    en: {
      short: { year: "numeric", month: "short", day: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric" },
    },
  },
});

export function setLocale(locale) {
  if (locale !== "fr" && locale !== "en") return;
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  updateHreflang(locale);
}

function updateHreflang(locale) {
  document.documentElement.lang = locale;

  // Supprime les anciennes balises hreflang
  document
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((el) => el.remove());

  // Ajoute les nouvelles
  ["fr", "en"].forEach((l) => {
    const link = document.createElement("link");
    link.rel = "alternate";
    link.hreflang = l;
    link.href = \`\${window.location.origin}\${l === "fr" ? "" : "/en"}\${window.location.pathname}\`;
    document.head.appendChild(link);
  });
}

export const availableLocales = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
];
`;

const LANGUAGE_SWITCHER = `<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { setLocale, availableLocales } from "@/i18n";

const { locale } = useI18n();
const open = ref(false);

const current = computed(() =>
  availableLocales.find((l) => l.code === locale.value) || availableLocales[0]
);

function change(code) {
  setLocale(code);
  open.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
      @click="open = !open"
      aria-label="Change language"
    >
      <span class="text-base">{{ current.flag }}</span>
      <span class="hidden sm:inline font-medium uppercase">{{ current.code }}</span>
      <svg
        class="w-3 h-3 transition"
        :class="open && 'rotate-180'"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-40 card p-1 shadow-lg z-50"
      @click.stop
    >
      <button
        v-for="l in availableLocales"
        :key="l.code"
        :class="[
          'flex items-center gap-2 w-full px-3 py-2 text-sm rounded transition',
          l.code === locale
            ? 'bg-brand-50 text-brand-700 font-medium'
            : 'hover:bg-slate-50 text-slate-700',
        ]"
        @click="change(l.code)"
      >
        <span class="text-base">{{ l.flag }}</span>
        <span>{{ l.label }}</span>
      </button>
    </div>
  </div>
</template>
`;

const MAIN_JS = `import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { i18n } from "./i18n";
import { useAuthStore } from "@/stores/auth";
import "./assets/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(i18n);
app.use(router);

const auth = useAuthStore();
auth.init().finally(() => {
  app.mount("#app");
});
`;

const ROUTER = `import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { i18n, setLocale } from "@/i18n";

const routes = [
  {
    path: "/:lang(fr|en)?",
    children: [
      { path: "", name: "home", component: () => import("@/views/HomeView.vue"), meta: { title: "Accueil" } },
      { path: "jobs", name: "jobs", component: () => import("@/views/JobsView.vue"), meta: { title: "Offres d'emploi" } },
      { path: "jobs/:id", name: "job-detail", component: () => import("@/views/JobDetailView.vue"), meta: { title: "Detail" } },
      { path: "stats", name: "stats", component: () => import("@/views/StatsView.vue"), meta: { title: "Statistiques" } },
      { path: "login", name: "login", component: () => import("@/views/LoginView.vue"), meta: { guestOnly: true } },
      { path: "signup", name: "signup", component: () => import("@/views/SignupView.vue"), meta: { guestOnly: true } },
      { path: "reset-password", name: "reset-password", component: () => import("@/views/ResetPasswordView.vue"), meta: { guestOnly: true } },
      { path: "account", name: "account", component: () => import("@/views/AccountView.vue"), meta: { requiresAuth: true } },
      { path: "admin", name: "admin", component: () => import("@/views/AdminView.vue"), meta: { requiresAuth: true, requiresAdmin: true } },
    ],
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

router.beforeEach(async (to, _from, next) => {
  const lang = to.params.lang;

  if (lang === "en" && i18n.global.locale.value !== "en") {
    setLocale("en");
  } else if ((!lang || lang === "fr") && i18n.global.locale.value !== "fr") {
    setLocale("fr");
  }

  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.init();
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: "login", query: { redirect: to.fullPath } });
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next({ name: "home" });
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return next({ name: "account" });
  }

  next();
});

export default router;
`;

const APP_HEADER = `<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher.vue";

const { t } = useI18n();
const auth = useAuthStore();
const open = ref(false);
const menuOpen = ref(false);

const links = [
  { to: "/", labelKey: "nav.home" },
  { to: "/jobs", labelKey: "nav.jobs" },
  { to: "/stats", labelKey: "nav.stats" },
];
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-40">
    <div class="container-page flex items-center justify-between h-16">
      <RouterLink to="/" class="flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">
          JA
        </span>
        <span class="font-bold text-lg text-slate-800">{{ t("common.app_name") }}</span>
      </RouterLink>

      <nav class="hidden md:flex items-center gap-6">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="text-sm font-medium text-slate-600 hover:text-brand-600 transition"
          active-class="text-brand-600"
        >
          {{ t(l.labelKey) }}
        </RouterLink>

        <LanguageSwitcher />

        <template v-if="auth.isAuthenticated">
          <div class="relative">
            <button
              class="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-brand-600"
              @click="menuOpen = !menuOpen"
            >
              <span class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
                {{ auth.userEmail.charAt(0).toUpperCase() }}
              </span>
            </button>

            <div
              v-if="menuOpen"
              class="absolute right-0 mt-2 w-48 card p-1 shadow-lg z-50"
              @click="menuOpen = false"
            >
              <RouterLink to="/account" class="block px-3 py-2 text-sm hover:bg-slate-50 rounded">
                {{ t("nav.account") }}
              </RouterLink>
              <RouterLink
                v-if="auth.isAdmin"
                to="/admin"
                class="block px-3 py-2 text-sm hover:bg-slate-50 rounded text-brand-600 font-medium"
              >
                👑 {{ t("nav.admin") }}
              </RouterLink>
              <button
                class="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded text-red-600"
                @click="auth.logout()"
              >
                {{ t("nav.logout") }}
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <RouterLink to="/login" class="text-sm font-medium text-slate-600 hover:text-brand-600">
            {{ t("nav.login") }}
          </RouterLink>
          <RouterLink to="/signup" class="btn bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm">
            {{ t("nav.signup") }}
          </RouterLink>
        </template>
      </nav>

      <button class="md:hidden p-2" @click="open = !open">
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
          {{ t(l.labelKey) }}
        </RouterLink>
        <LanguageSwitcher />
      </nav>
    </div>
  </header>
</template>
`;

const FORMAT_UTILS = `import { i18n } from "@/i18n";

const { t } = i18n.global;

export function timeAgo(dateString) {
  if (!dateString) return t("time.unknown");

  const date = new Date(dateString);
  if (isNaN(date)) return t("time.unknown");

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return t("time.just_now");
  if (seconds < 3600) return t("time.minutes_ago", { n: Math.floor(seconds / 60) });

  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return t("time.hours_ago", { n: hours });

  const days = Math.floor(hours / 24);
  if (days < 30) return t("time.days_ago", { n: days });

  const months = Math.floor(days / 30);
  if (months < 12) return t("time.months_ago", { n: months });

  return t("time.years_ago", { n: Math.floor(months / 12) });
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString(i18n.global.locale.value === "en" ? "en-GB" : "fr-FR", {
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
    "Côte d'Ivoire": "🇨🇮", "Ivory Coast": "🇨🇮",
    Sénégal: "🇸🇳", Senegal: "🇸🇳",
    "Burkina Faso": "🇧🇫",
    Mali: "🇲🇱",
    Niger: "🇳🇪",
    Guinée: "🇬🇳", Guinea: "🇬🇳",
    Ghana: "🇬🇭",
    Nigeria: "🇳🇬",
    Kenya: "🇰🇪",
    Uganda: "🇺🇬",
    "Afrique du Sud": "🇿🇦", "South Africa": "🇿🇦",
  };
  return map[country] || "🌍";
}
`;

// ==================== BACKEND ====================

const I18N_CORE = `"""
Traductions cote serveur (emails, erreurs API).

Support : fr (defaut), en.
"""

from typing import Literal


Lang = Literal["fr", "en"]


TRANSLATIONS: dict[str, dict[Lang, str]] = {
    # Emails
    "email_alert_subject": {
        "fr": "🔔 {count} nouvelle(s) offre(s) — {alert_name}",
        "en": "🔔 {count} new offer(s) — {alert_name}",
    },
    "email_alert_title": {
        "fr": "{count} nouvelle(s) offre(s) pour votre alerte",
        "en": "{count} new offer(s) for your alert",
    },
    "email_welcome_title": {
        "fr": "Bienvenue sur Job Africa, {name} 👋",
        "en": "Welcome to Job Africa, {name} 👋",
    },
    "email_cta_view_all": {
        "fr": "Voir toutes les offres",
        "en": "View all offers",
    },
    "email_footer_reason": {
        "fr": "Vous recevez cet email car vous avez configure une alerte sur Job Africa.",
        "en": "You are receiving this email because you set up an alert on Job Africa.",
    },
    "email_footer_manage": {
        "fr": "Gerer mes alertes",
        "en": "Manage my alerts",
    },

    # Erreurs API
    "error_not_found": {
        "fr": "Ressource introuvable",
        "en": "Resource not found",
    },
    "error_unauthorized": {
        "fr": "Authentification requise",
        "en": "Authentication required",
    },
    "error_forbidden": {
        "fr": "Acces refuse",
        "en": "Access denied",
    },
    "error_validation": {
        "fr": "Donnees invalides",
        "en": "Invalid data",
    },
}


def get_lang(accept_language: str | None) -> Lang:
    """Detecte la langue depuis l'en-tete Accept-Language."""

    if not accept_language:
        return "fr"

    lang = accept_language.lower().split(",")[0].split("-")[0].strip()

    return "en" if lang == "en" else "fr"


def t(key: str, lang: Lang = "fr", **kwargs) -> str:
    """Traduit une cle dans la langue donnee."""

    entry = TRANSLATIONS.get(key)
    if not entry:
        return key

    text = entry.get(lang) or entry.get("fr", key)

    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError):
            return text

    return text
`;

const I18N_MIDDLEWARE = `"""
Middleware pour la detection de la langue.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.i18n import get_lang


class LanguageMiddleware(BaseHTTPMiddleware):
    """Injecte la langue detectee dans request.state.lang."""

    async def dispatch(self, request: Request, call_next):
        accept = request.headers.get("accept-language")
        request.state.lang = get_lang(accept)

        response = await call_next(request)
        response.headers["Content-Language"] = request.state.lang

        return response
`;

// ==================== Fichiers ====================

const FILES = {
  "frontend/src/i18n/locales/fr.json": LOCALE_FR,
  "frontend/src/i18n/locales/en.json": LOCALE_EN,
  "frontend/src/i18n/index.js": I18N_INDEX,
  "frontend/src/components/ui/LanguageSwitcher.vue": LANGUAGE_SWITCHER,
  "frontend/src/main.js": MAIN_JS,
  "frontend/src/router/index.js": ROUTER,
  "frontend/src/components/layout/AppHeader.vue": APP_HEADER,
  "frontend/src/utils/format.js": FORMAT_UTILS,
  "backend/app/core/i18n.py": I18N_CORE,
  "backend/app/core/middleware.py": I18N_MIDDLEWARE,
};

// ==================== Patch main.py backend ====================

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) return false;

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("LanguageMiddleware")) {
    log.info("main.py deja patche");
    return true;
  }

  // Ajoute l'import et le middleware
  if (!content.includes("from app.core.middleware import LanguageMiddleware")) {
    content = content.replace(
      /^(from app\.core\.config import[^\n]*)/m,
      "from app.core.middleware import LanguageMiddleware\n$1"
    );
  }

  if (!content.includes("app.add_middleware(LanguageMiddleware)")) {
    content = content.replace(
      /^(app\.add_middleware\([^\n]*\))/m,
      "$1\napp.add_middleware(LanguageMiddleware)"
    );
  }

  fs.writeFileSync(fullPath, content, "utf8");
  log.file(mainPath + " (patché)", "overwritten");
  return true;
}

// ==================== Patch package.json ====================

function patchPackageJson() {
  const pkgPath = "frontend/package.json";
  const fullPath = path.join(ROOT, pkgPath);

  if (!fs.existsSync(fullPath)) return false;

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("vue-i18n")) {
    log.info("package.json deja patche");
    return true;
  }

  try {
    const pkg = JSON.parse(content);
    pkg.dependencies["vue-i18n"] = "^9.14.1";
    fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2), "utf8");
    log.file(pkgPath + " (patché)", "overwritten");
    return true;
  } catch (e) {
    log.warn(`Erreur patch package.json : ${e.message}`);
    return false;
  }
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 12 — MULTI-LANGUE FR/EN");

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
    log.banner("MODULE 12 — DESINSTALLE");
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

  log.section("Patch backend (main.py)");
  patchMainPy();

  log.section("Patch package.json");
  patchPackageJson();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 12 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  ───────────────────────────────────────");
  console.log("");
  console.log("  1. Installer vue-i18n :");
  console.log("     cd frontend");
  console.log("     npm install");
  console.log("");
  console.log("  2. Relancer Uvicorn :");
  console.log("     cd backend");
  console.log("     uvicorn app.main:app --reload --reload-dir app");
  console.log("");
  console.log("  3. Relancer le frontend :");
  console.log("     cd frontend");
  console.log("     npm run dev");
  console.log("");
  console.log("  4. Tester :");
  console.log("     http://localhost:5173/       (FR)");
  console.log("     http://localhost:5173/en     (EN)");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  process.exit(1);
});