<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import paymentApi from "@/services/payment";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps({
  job: { type: Object, required: true },
  variant: { type: String, default: "button" },
});

const emit = defineEmits(["boosted"]);

const router = useRouter();
const auth = useAuthStore();

const loading = ref(false);
const success = ref(false);
const error = ref("");

async function handleBoost() {
  error.value = "";

  if (!auth.isAuthenticated) {
    router.push({
      name: "login",
      query: { redirect: "/jobs/" + props.job.id },
    });
    return;
  }

  loading.value = true;

  try {
    const result = await paymentApi.boostJob(props.job.id);

    if (result && result.reference) {
      success.value = true;

      const message =
        "Transaction creee !\n\n" +
        "Reference : " + result.reference + "\n" +
        "Montant : " + result.montant + " FCFA\n\n" +
        "Votre offre sera boostee des confirmation du paiement.";

      alert(message);

      emit("boosted", result);

      setTimeout(function () {
        window.location.reload();
      }, 1000);
    }
  } catch (e) {
    console.error("Erreur boost :", e);
    error.value = "Erreur lors de la creation de la transaction";
    alert(error.value);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
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

  <button
    v-else-if="variant === 'compact' && !job.is_premium"
    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-600 hover:bg-amber-50 transition"
    :disabled="loading || success"
    @click.stop.prevent="handleBoost"
  >
    <span v-if="success">Boosté</span>
    <span v-else-if="loading">Création...</span>
    <span v-else>Booster</span>
  </button>

  <BaseButton
    v-else-if="variant === 'button' && !job.is_premium"
    variant="outline"
    size="md"
    class="w-full"
    :disabled="loading || success"
    @click.stop.prevent="handleBoost"
  >
    <span v-if="success">Boosté</span>
    <span v-else-if="loading">Création...</span>
    <span v-else>Booster cette offre (2000 FCFA)</span>
  </BaseButton>

  <div
    v-else
    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 text-sm font-medium"
  >
    Premium actif
  </div>
</template>
