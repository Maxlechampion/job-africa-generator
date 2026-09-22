<script setup>
import JobCard from "./JobCard.vue";
import BaseSpinner from "@/components/ui/BaseSpinner.vue";
import EmptyState from "@/components/ui/EmptyState.vue";

defineProps({
  jobs: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
});
</script>

<template>
  <div>
    <BaseSpinner v-if="loading" />

    <EmptyState
      v-else-if="error"
      title="Erreur"
      :description="error"
    />

    <EmptyState
      v-else-if="!jobs.length"
      title="Aucune offre trouvee"
      description="Essayez de modifier vos criteres de recherche ou revenez plus tard."
    />

    <div v-else class="grid sm:grid-cols-2 gap-4">
      <JobCard v-for="job in jobs" :key="job.id" :job="job" />
    </div>
  </div>
</template>
