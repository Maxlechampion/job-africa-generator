<script setup>
import BaseBadge from "@/components/ui/BaseBadge.vue";
import { timeAgo, truncate, countryFlag } from "@/utils/format";

defineProps({
  job: { type: Object, required: true },
});
</script>

<template>
  <RouterLink
    :to="`/jobs/${job.id}`"
    class="card block hover:shadow-md hover:-translate-y-0.5 transition group"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <h3
          class="font-semibold text-slate-800 group-hover:text-brand-600 transition text-sm sm:text-base line-clamp-2"
        >
          {{ job.titre }}
        </h3>

        <p v-if="job.entreprise" class="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-1">
          {{ job.entreprise }}
        </p>

        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-xs">
          <BaseBadge v-if="job.pays" variant="brand">
            {{ countryFlag(job.pays) }} {{ job.pays }}
          </BaseBadge>

          <BaseBadge v-if="job.ville" variant="default">
            📍 {{ job.ville }}
          </BaseBadge>

          <BaseBadge v-if="job.type_contrat" variant="info">
            💼 {{ job.type_contrat }}
          </BaseBadge>

          <BaseBadge v-if="job.teletravail" variant="success">
            🌐 Télétravail
          </BaseBadge>
        </div>
      </div>
    </div>

    <p
      v-if="job.description"
      class="text-xs sm:text-sm text-slate-500 mt-2 sm:mt-3 leading-relaxed line-clamp-2"
    >
      {{ truncate(job.description, 160) }}
    </p>

    <div
      class="flex items-center justify-between mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 text-xs text-slate-400"
    >
      <span class="truncate">📅 {{ timeAgo(job.date_publication || job.created_at) }}</span>
      <span class="truncate ml-2">🔗 {{ job.source }}</span>
    </div>
  </RouterLink>
</template>