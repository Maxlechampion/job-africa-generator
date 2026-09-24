<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import paymentApi from "@/services/payment";

const props = defineProps({
  type: { type: String, required: true },
  metadata: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["success", "cancel", "error"]);

const auth = useAuthStore();
const toast = useToastStore();

const loading = ref(true);
const widgetReady = ref(false);

let widgetInstance = null;

// ==================== Charger le SDK KKiaPay ====================
function loadKkiaPaySDK() {
  return new Promise((resolve, reject) => {
    if (window.openKkiapayWidget) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.kkiapay.me/k.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger KKiaPay"));

    document.head.appendChild(script);
  });
}

// ==================== Ouvrir le widget ====================
async function openWidget() {
  try {
    const result = await paymentApi.initiate(props.type, props.metadata);

    const kkiapay = result.kkiapay;

    if (!kkiapay) {
      throw new Error("Configuration KKiaPay manquante");
    }

    // Ouvre le widget KKiaPay
    window.openKkiapayWidget({
      amount: kkiapay.amount,
      api_key: kkiapay.public_key,
      sandbox: kkiapay.sandbox,
      email: auth.userEmail || "client@jobafrica.app",
      name: auth.userEmail?.split("@")[0] || "Client",
      data: result.reference, // Reference JA-2026-XXXX
      theme: "#2f8f5c",
      position: "center",
      callback: "https://frontend-zeta-six-12mzm0ovel.vercel.app/jobs",
    });

    loading.value = false;
    widgetReady.value = true;
  } catch (e) {
    console.error("Erreur ouverture widget :", e);
    loading.value = false;
    toast.error("Erreur", "Impossible d'ouvrir le widget de paiement");
    emit("error", e);
  }
}

// ==================== Listener ====================
function setupListeners() {
  if (!window.addKkiapayListener) return;

  window.addKkiapayListener("success", (response) => {
    console.log("KkiaPay success :", response);

    toast.success(
      "Paiement réussi !",
      "Votre offre sera boostée dans quelques instants."
    );

    emit("success", response);

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  });

  window.addKkiapayListener("failed", (error) => {
    console.log("KkiaPay failed :", error);

    toast.error(
      "Paiement échoué",
      "Votre paiement n'a pas abouti. Réessayez."
    );

    emit("error", error);
  });
}

onMounted(async () => {
  try {
    await loadKkiaPaySDK();
    setupListeners();
    await openWidget();
  } catch (e) {
    loading.value = false;
    emit("error", e);
  }
});

onUnmounted(() => {
  if (window.removeKkiapayListener) {
    window.removeKkiapayListener("success");
    window.removeKkiapayListener("failed");
  }
});
</script>

<template>
  <div class="text-center py-8">
    <div v-if="loading" class="space-y-3">
      <div class="w-10 h-10 mx-auto border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      <p class="text-sm text-slate-500">Ouverture du paiement...</p>
    </div>

    <div v-else-if="widgetReady" class="space-y-3">
      <div class="text-4xl">💳</div>
      <p class="text-sm text-slate-600">
        Widget KKiaPay ouvert. Suivez les instructions.
      </p>
      <button
        class="text-xs text-brand-600 hover:underline"
        @click="openWidget"
      >
        Rouvrir le widget
      </button>
    </div>
  </div>
</template>
