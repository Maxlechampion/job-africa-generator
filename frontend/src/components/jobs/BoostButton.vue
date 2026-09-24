<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import paymentApi from "@/services/payment";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps({
  job: { type: Object, required: true },
  variant: { type: String, default: "button" },
});

const emit = defineEmits(["boosted"]);

const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();

const loading = ref(false);
const success = ref(false);
const error = ref("");

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

// ==================== Ouvrir le widget KKiaPay ====================
async function openKkiaPayWidget() {
  try {
    const result = await paymentApi.initiate("premium_job", {
      job_id: props.job.id,
    });

    console.log("[BOOST] Réponse API :", result);

    const kkiapay = result.kkiapay;

    if (!kkiapay) {
      throw new Error("Configuration KKiaPay manquante dans la réponse");
    }

    // Charger le SDK si nécessaire
    await loadKkiaPaySDK();

    // Ouvrir le widget
    window.openKkiapayWidget({
      amount: kkiapay.amount,
      api_key: kkiapay.public_key,
      sandbox: kkiapay.sandbox,
      email: auth.userEmail || "client@jobafrica.app",
      name: auth.userEmail ? auth.userEmail.split("@")[0] : "Client",
      data: result.reference,
      theme: "#2f8f5c",
      position: "center",
    });

    // Écouter les événements
    if (window.addKkiapayListener) {
      window.addKkiapayListener("success", (response) => {
        console.log("[BOOST] KKiaPay success :", response);

        toast.success(
          "Paiement réussi !",
          "Votre offre sera boostée dans quelques instants."
        );

        emit("boosted", response);

        // Recharge après 2 secondes
        setTimeout(() => window.location.reload(), 2000);
      });

      window.addKkiapayListener("failed", (error) => {
        console.log("[BOOST] KKiaPay failed :", error);

        toast.error(
          "Paiement échoué",
          "Votre paiement n'a pas abouti. Réessayez."
        );
      });
    }
  } catch (e) {
    console.error("[BOOST] Erreur KKiaPay :", e);
    throw e;
  }
}

// ==================== Handler principal ====================
async function handleBoost() {
  error.value = "";

  // Vérifier l'authentification
  if (!auth.isAuthenticated) {
    router.push({
      name: "login",
      query: { redirect: "/jobs/" + props.job.id },
    });
    return;
  }

  loading.value = true;

  try {
    await openKkiaPayWidget();
  } catch (e) {
    console.error("Erreur boost :", e);
    error.value = "Erreur lors de l'ouverture du paiement";
    toast.error("Erreur", error.value);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Variante icône -->
    <button
      v-if="variant === 'icon' && !job.is_premium"
      class="w-9 h-9 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 transition"
      title="Booster cette offre (2000 FCFA)"
      :disabled="loading || success"
      @click.stop.prevent="handleBoost"
    >
      <span v-if="success" class="text-lg">OK</span>
      <span v-else-if="loading" class="text-lg">...</span>
      <span v-else class="text-lg">*</span>
    </button>

    <!-- Variante compacte -->
    <button
      v-else-if="variant === 'compact' && !job.is_premium"
      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-600 hover:bg-amber-50 transition"
      :disabled="loading || success"
      @click.stop.prevent="handleBoost"
    >
      <span v-if="success">Boosté</span>
      <span v-else-if="loading">Ouverture...</span>
      <span v-else>Booster</span>
    </button>

    <!-- Variante bouton normal -->
    <BaseButton
      v-else-if="variant === 'button' && !job.is_premium"
      variant="outline"
      size="md"
      class="w-full"
      :disabled="loading || success"
      @click.stop.prevent="handleBoost"
    >
      <span v-if="success">Boosté</span>
      <span v-else-if="loading">Ouverture...</span>
      <span v-else>Booster cette offre (2000 FCFA)</span>
    </BaseButton>

    <!-- Offre déjà boostée -->
    <div
      v-else
      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 text-sm font-medium"
    >
      Premium actif
    </div>
  </div>
</template>
