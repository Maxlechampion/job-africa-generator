<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import JobSearchBar from "@/components/jobs/JobSearchBar.vue";
import JobList from "@/components/jobs/JobList.vue";
import JobStats from "@/components/jobs/JobStats.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import api from "@/services/api";

const router = useRouter();
const jobs = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await api.getJobs({ limit: 6 });
    jobs.value = data.results || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});

function search(q) {
  router.push({ path: "/jobs", query: q ? { q } : {} });
}
</script>

<template>
  <div>
    <section class="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
      <div class="container-page py-16 md:py-24">
        <div class="max-w-3xl">
          <h1 class="text-3xl md:text-5xl font-bold leading-tight">
            Trouvez votre prochain emploi en
            <span class="text-accent-400">Afrique de l'Ouest</span>
          </h1>
          <p class="mt-4 text-brand-50/90 text-lg">
            Des milliers d'offres agregees depuis les meilleures plateformes,
            mises a jour automatiquement.
          </p>
        </div>

        <div class="mt-8 max-w-3xl">
          <JobSearchBar @search="search" />
        </div>
      </div>
    </section>

    <section class="container-page -mt-8 relative z-10">
      <JobStats />
    </section>

    <section class="container-page py-14">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-slate-800">
            Dernieres offres publiees
          </h2>
          <p class="text-sm text-slate-500 mt-1">
            Mises a jour automatiquement toutes les 6 heures.
          </p>
        </div>
        <BaseButton variant="outline" @click="router.push('/jobs')">
          Voir toutes les offres →
        </BaseButton>
      </div>

      <JobList :jobs="jobs" :loading="loading" />
    </section>

    <section class="bg-white border-y border-slate-200">
      <div class="container-page py-14">
        <h2 class="text-2xl font-bold text-slate-800 text-center mb-10">
          Comment ca marche ?
        </h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="text-center p-6">
            <div class="text-4xl mb-3">🔎</div>
            <h3 class="font-semibold text-slate-800 mb-2">Recherchez</h3>
            <p class="text-sm text-slate-500">
              Filtrez par pays, ville, categorie, type de contrat ou teletravail.
            </p>
          </div>
          <div class="text-center p-6">
            <div class="text-4xl mb-3">📄</div>
            <h3 class="font-semibold text-slate-800 mb-2">Consultez</h3>
            <p class="text-sm text-slate-500">
              Accedez au detail complet de chaque offre et postulez en un clic.
            </p>
          </div>
          <div class="text-center p-6">
            <div class="text-4xl mb-3">🚀</div>
            <h3 class="font-semibold text-slate-800 mb-2">Postulez</h3>
            <p class="text-sm text-slate-500">
              Vous etes redirige vers la source officielle de l'offre.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
