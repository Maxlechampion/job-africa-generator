<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";

import BaseBadge from "@/components/ui/BaseBadge.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseSpinner from "@/components/ui/BaseSpinner.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import ShareButton from "@/components/jobs/ShareButton.vue";
import BoostButton from "@/components/jobs/BoostButton.vue";

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
  <div class="container-page py-4 sm:py-6 md:py-8">
    <RouterLink
      to="/jobs"
      class="text-xs sm:text-sm text-slate-500 hover:text-brand-600 inline-flex items-center gap-1 mb-3 sm:mb-4"
    >
      ← Retour aux offres
    </RouterLink>

    <BaseSpinner v-if="loading" />

    <EmptyState
      v-else-if="error || !job"
      title="Offre introuvable"
      :description="error || 'Cette offre n\'existe plus.'"
    />

    <article v-else class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
      <!-- Contenu principal -->
      <div class="card">
        <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
          {{ job.titre }}
        </h1>

        <p v-if="job.entreprise" class="text-base sm:text-lg text-slate-600 mt-2">
          {{ job.entreprise }}
        </p>

        <div class="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
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
            🌐 Télétravail
          </BaseBadge>
        </div>

        <div class="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-100">
          <h2 class="text-base sm:text-lg font-semibold text-slate-800 mb-3">
            Description du poste
          </h2>
          <div class="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {{ job.description || "Aucune description disponible." }}
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-3 sm:space-y-4 sidebar-sticky">
        <div class="card">
          <BaseButton size="lg" class="w-full" @click="apply">
            Postuler maintenant →
          </BaseButton>

          <div class="mt-3">
            <ShareButton :job="job" />
          </div>

          <div class="mt-3">
            <BoostButton :job="job" variant="button" />
          </div>

          <div class="mt-4 space-y-3 text-sm">
            <div class="flex justify-between gap-2">
              <span class="text-slate-500">Source</span>
              <span class="font-medium text-slate-800 text-right truncate">
                {{ job.source }}
              </span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-slate-500">Publiée</span>
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

        <div class="card text-xs text-slate-500">
          💡 Astuce : vérifiez toujours l'offre sur le site source avant de postuler.
        </div>
      </aside>
    </article>
  </div>
</template>