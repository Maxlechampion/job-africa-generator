<script setup>
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
