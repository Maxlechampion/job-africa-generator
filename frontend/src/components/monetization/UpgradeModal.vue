<script setup>
import { ref, onMounted } from "vue";
import paymentApi from "@/services/payment";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps({
  jobId: { type: Number, required: true },
});

const emit = defineEmits(["close", "paid"]);

const loading = ref(false);
const transaction = ref(null);
const error = ref("");

async function initiate() {
  loading.value = true;
  error.value = "";

  try {
    transaction.value = await paymentApi.boostJob(props.jobId);
  } catch (e) {
    error.value = "Impossible de créer la transaction";
  } finally {
    loading.value = false;
  }
}

onMounted(initiate);
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
      <h2 class="text-xl font-bold text-slate-800 mb-2">
        ⭐ Passer en Premium
      </h2>
      <p class="text-sm text-slate-500 mb-6">
        Votre offre sera mise en avant pendant 30 jours en haut des résultats.
      </p>

      <div class="bg-slate-50 rounded-xl p-4 mb-6">
        <div class="flex justify-between items-center">
          <span class="text-sm text-slate-600">Montant</span>
          <span class="font-bold text-slate-800">
            {{ transaction?.montant || 2000 }} FCFA
          </span>
        </div>
        <div class="flex justify-between items-center mt-2">
          <span class="text-sm text-slate-600">Durée</span>
          <span class="font-medium text-slate-800">30 jours</span>
        </div>
      </div>

      <div v-if="error" class="text-sm text-red-600 mb-4">{{ error }}</div>

      <BaseButton
        size="lg"
        class="w-full"
        :disabled="loading || !transaction"
        @click="$emit('paid', transaction)"
      >
        {{ loading ? "Création…" : "Payer maintenant" }}
      </BaseButton>

      <button
        class="w-full mt-3 text-sm text-slate-500 hover:text-slate-700"
        @click="emit('close')"
      >
        Annuler
      </button>
    </div>
  </div>
</template>
