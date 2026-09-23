import { createApp } from "vue";
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
