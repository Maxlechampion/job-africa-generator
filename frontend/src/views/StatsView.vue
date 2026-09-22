<script setup>
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
