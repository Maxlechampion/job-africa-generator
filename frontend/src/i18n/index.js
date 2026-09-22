import { createI18n } from "vue-i18n";
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
    link.href = `${window.location.origin}${l === "fr" ? "" : "/en"}${window.location.pathname}`;
    document.head.appendChild(link);
  });
}

export const availableLocales = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
];
