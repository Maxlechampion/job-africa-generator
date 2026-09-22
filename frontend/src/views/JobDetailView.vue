<script setup>
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";

import BaseBadge from "@/components/ui/BaseBadge.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseSpinner from "@/components/ui/BaseSpinner.vue";
import EmptyState from "@/components/ui/EmptyState.vue";

import { useJobsStore } from "@/stores/jobs";
import { formatDate, timeAgo, countryFlag } from "@/utils/format";

const route = useRoute();
const store = useJobsStore();
const { currentJob: job, loading, error } = storeToRefs(store);

onMounted(() => {
  store.fetchJob(route.params.id);
});

function apply() {
  if (job.value?.url) window.open(job.value.url, "_blank");
}
</script>

<template>
  <div class="container-page py-8">
    <RouterLink
      to="/jobs"
      class="text-sm text-slate-500 hover:text-brand-600 inline-flex items-center gap-1 mb-4"
    >
      ← Retour aux offres
    </RouterLink>

    <BaseSpinner v-if="loading" />

    <EmptyState
      v-else-if="error || !job"
      title="Offre introuvable"
      :description="error || 'Cette offre n\'existe plus.'"
    />

    <article v-else class="grid lg:grid-cols-[1fr_320px] gap-6">
      <div class="card p-6 md:p-8">
        <h1 class="text-2xl md:text-3xl font-bold text-slate-800">
          {{ job.titre }}
        </h1>

        <p v-if="job.entreprise" class="text-lg text-slate-600 mt-2">
          {{ job.entreprise }}
        </p>

        <div class="flex flex-wrap gap-2 mt-4">
          <BaseBadge v-if="job.pays" variant="brand">
            {{ countryFlag(job.pays) }} {{ job.pays }}
          </BaseBadge>
          <BaseBadge v-if="job.ville" variant="default">
            📍 {{ job.ville }}
          </BaseBadge>
          <BaseBadge v-if="job.type_contrat" variant="info">
            💼 {{ job.type_contrat }}
          </BaseBadge>
          <BaseBadge v-if="job.niveau" variant="accent">
            🎓 {{ job.niveau }}
          </BaseBadge>
          <BaseBadge v-if="job.categorie" variant="accent">
            🏷️ {{ job.categorie }}
          </BaseBadge>
          <BaseBadge v-if="job.teletravail" variant="success">
            🌐 Teletravail
          </BaseBadge>
        </div>

        <div v-if="job.resume_ia" class="mt-6 p-4 bg-brand-50 rounded-lg border border-brand-100">
          <h2 class="text-sm font-semibold text-brand-700 mb-2">
            🤖 Resume IA
          </h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            {{ job.resume_ia }}
          </p>
        </div>

        <div class="mt-6 pt-6 border-t border-slate-100">
          <h2 class="text-lg font-semibold text-slate-800 mb-3">
            Description du poste
          </h2>
          <div
            class="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-line"
          >
            {{ job.description || "Aucune description disponible." }}
          </div>
        </div>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div class="card p-5">
          <BaseButton size="lg" class="w-full" @click="apply">
            Postuler maintenant →
          </BaseButton>

          <div class="mt-4 space-y-3 text-sm">
            <div class="flex justify-between gap-2">
              <span class="text-slate-500">Source</span>
              <span class="font-medium text-slate-800 text-right">
                {{ job.source }}
              </span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-slate-500">Publiee</span>
              <span class="font-medium text-slate-800">
                {{ timeAgo(job.date_publication || job.created_at) }}
              </span>
            </div>
            <div v-if="job.date_publication" class="flex justify-between gap-2">
              <span class="text-slate-500">Date</span>
              <span class="font-medium text-slate-800">
                {{ formatDate(job.date_publication) }}
              </span>
            </div>
          </div>
        </div>

        <div class="card p-5 text-xs text-slate-500">
          💡 Astuce : verifiez toujours l'offre sur le site source avant de postuler.
        </div>
      </aside>
    </article>
  </div>
</template>
