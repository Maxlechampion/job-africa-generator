<script setup>
import { reactive, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import JobSearchBar from "@/components/jobs/JobSearchBar.vue";
import JobFilters from "@/components/jobs/JobFilters.vue";
import JobList from "@/components/jobs/JobList.vue";
import BasePagination from "@/components/ui/BasePagination.vue";

import { useJobsStore } from "@/stores/jobs";
import { PAGE_SIZE } from "@/utils/constants";

const route = useRoute();
const router = useRouter();
const store = useJobsStore();
const { jobs, total, loading, error } = storeToRefs(store);

const filters = reactive({
  q: route.query.q || "",
  pays: route.query.pays || null,
  ville: route.query.ville || null,
  categorie: route.query.categorie || null,
  type_contrat: route.query.type_contrat || null,
  teletravail:
    route.query.teletravail === "true"
      ? true
      : route.query.teletravail === "false"
      ? false
      : null,
  limit: PAGE_SIZE,
  offset: 0,
});

function buildParams() {
  const p = { limit: filters.limit, offset: filters.offset };
  for (const k of ["q", "pays", "ville", "categorie", "type_contrat"]) {
    if (filters[k]) p[k] = filters[k];
  }
  if (filters.teletravail !== null) p.teletravail = filters.teletravail;
  return p;
}

async function load() {
  await store.fetchJobs(buildParams());

  const query = {};
  for (const k of ["q", "pays", "ville", "categorie", "type_contrat"]) {
    if (filters[k]) query[k] = filters[k];
  }
  if (filters.teletravail !== null) query.teletravail = String(filters.teletravail);
  router.replace({ query });
}

function onSearch(q) {
  filters.q = q;
  filters.offset = 0;
  load();
}

function onFilterChange(v) {
  Object.assign(filters, v);
  filters.offset = 0;
  load();
}

function resetFilters() {
  filters.pays = null;
  filters.ville = null;
  filters.categorie = null;
  filters.type_contrat = null;
  filters.teletravail = null;
  filters.q = "";
  filters.offset = 0;
  load();
}

function onPageChange(offset) {
  filters.offset = offset;
  load();
}

onMounted(load);

watch(
  () => route.query,
  (nq) => {
    if (nq.q !== undefined) filters.q = nq.q;
  }
);
</script>

<template>
  <div class="container-page py-8">
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-slate-800">
        Offres d'emploi
      </h1>
      <p class="text-sm text-slate-500 mt-1">
        {{ total }} offre{{ total > 1 ? "s" : "" }} disponible{{
          total > 1 ? "s" : ""
        }}
      </p>
    </div>

    <div class="mb-6">
      <JobSearchBar :initial-query="filters.q" @search="onSearch" />
    </div>

    <div class="grid md:grid-cols-[260px_1fr] gap-6">
      <JobFilters
        :model-value="filters"
        @update:model-value="onFilterChange"
        @reset="resetFilters"
      />

      <div>
        <JobList :jobs="jobs" :loading="loading" :error="error" />

        <BasePagination
          v-if="!loading && jobs.length"
          :total="total"
          :limit="filters.limit"
          :offset="filters.offset"
          @change="onPageChange"
        />
      </div>
    </div>
  </div>
</template>
