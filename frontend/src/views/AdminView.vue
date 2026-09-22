<script setup>
import { onMounted, ref } from "vue";

import AdminKPI from "@/components/admin/AdminKPI.vue";
import AdminChart from "@/components/admin/AdminChart.vue";
import AdminTopSkills from "@/components/admin/AdminTopSkills.vue";
import AdminTopCountries from "@/components/admin/AdminTopCountries.vue";
import AdminSources from "@/components/admin/AdminSources.vue";
import AdminLogs from "@/components/admin/AdminLogs.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseSpinner from "@/components/ui/BaseSpinner.vue";

import dashboardApi from "@/services/dashboard";
import api from "@/services/api";

const data = ref(null);
const loading = ref(true);
const refreshing = ref(false);

async function load() {
  loading.value = true;
  try {
    data.value = await dashboardApi.getDashboard();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  refreshing.value = true;
  await load();
  refreshing.value = false;
}

async function triggerCollect() {
  if (!confirm("Lancer une collecte manuelle ?")) return;

  refreshing.value = true;
  try {
    await api.triggerCollect();
    await load();
  } finally {
    refreshing.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="container-page py-8">
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-800">
          📊 Dashboard Admin
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Vue d'ensemble de la plateforme Job Africa
        </p>
      </div>

      <div class="flex gap-2">
        <BaseButton variant="outline" :disabled="refreshing" @click="refresh">
          {{ refreshing ? "Chargement…" : "🔄 Actualiser" }}
        </BaseButton>
        <BaseButton :disabled="refreshing" @click="triggerCollect">
          🚀 Lancer une collecte
        </BaseButton>
      </div>
    </div>

    <BaseSpinner v-if="loading" />

    <div v-else-if="data" class="space-y-6">
      <AdminKPI :kpi="data.kpi" />

      <AdminChart :data="data.daily" />

      <div class="grid md:grid-cols-2 gap-6">
        <AdminTopSkills :skills="data.top_skills" />
        <AdminTopCountries :countries="data.top_pays" />
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <AdminSources :sources="data.sources" />
        <AdminLogs :logs="data.logs" />
      </div>
    </div>
  </div>
</template>
