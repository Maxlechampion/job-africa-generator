<script setup>
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
