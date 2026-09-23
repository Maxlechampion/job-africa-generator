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
    <!-- HERO -->
    <section class="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
      <div class="container-page py-10 xs:py-12 sm:py-16 md:py-20 lg:py-24">
        <div class="max-w-3xl">
          <h1 class="title-hero">
            Trouvez votre prochain emploi en
            <span class="text-accent-400">Afrique de l'Ouest</span>
          </h1>
          <p class="mt-3 sm:mt-4 text-brand-50/90 text-sm xs:text-base sm:text-lg">
            Des milliers d'offres agrégées depuis les meilleures plateformes, mises à jour automatiquement.
          </p>
        </div>

        <div class="mt-6 sm:mt-8 max-w-3xl">
          <JobSearchBar @search="search" />
        </div>
      </div>
    </section>

    <!-- STATS -->
    <section class="container-page -mt-6 sm:-mt-8 relative z-10">
      <JobStats />
    </section>

    <!-- DERNIÈRES OFFRES -->
    <section class="container-page py-10 sm:py-14">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h2 class="title-section">
            Dernières offres publiées
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Mises à jour automatiquement toutes les 6 heures.
          </p>
        </div>
        <BaseButton variant="outline" @click="router.push('/jobs')" class="w-full sm:w-auto">
          Voir toutes les offres →
        </BaseButton>
      </div>

      <JobList :jobs="jobs" :loading="loading" />
    </section>

    <!-- COMMENT ÇA MARCHE -->
    <section class="bg-white border-y border-slate-200">
      <div class="container-page py-10 sm:py-14">
        <h2 class="title-section text-center mb-8 sm:mb-10">
          Comment ça marche ?
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div class="text-center p-4 sm:p-6">
            <div class="text-3xl sm:text-4xl mb-3">🔎</div>
            <h3 class="font-semibold text-slate-800 mb-2 text-sm sm:text-base">
              Recherchez
            </h3>
            <p class="text-xs sm:text-sm text-slate-500">
              Filtrez par pays, ville, catégorie, type de contrat ou télétravail.
            </p>
          </div>
          <div class="text-center p-4 sm:p-6">
            <div class="text-3xl sm:text-4xl mb-3">📄</div>
            <h3 class="font-semibold text-slate-800 mb-2 text-sm sm:text-base">
              Consultez
            </h3>
            <p class="text-xs sm:text-sm text-slate-500">
              Accédez au détail complet de chaque offre et postulez en un clic.
            </p>
          </div>
          <div class="text-center p-4 sm:p-6">
            <div class="text-3xl sm:text-4xl mb-3">🚀</div>
            <h3 class="font-semibold text-slate-800 mb-2 text-sm sm:text-base">
              Postulez
            </h3>
            <p class="text-xs sm:text-sm text-slate-500">
              Vous êtes redirigé vers la source officielle de l'offre.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>