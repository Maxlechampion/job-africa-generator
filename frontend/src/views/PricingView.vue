<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import paymentApi from "@/services/payment";
import BaseButton from "@/components/ui/BaseButton.vue";

const router = useRouter();
const auth = useAuthStore();

const tarifs = ref({});
const moyens = ref({});
const loading = ref(true);

async function loadTarifs() {
  try {
    const data = await paymentApi.getTarifs();
    tarifs.value = data.tarifs || {};
    moyens.value = data.moyens_par_pays || {};
  } catch (e) {
    console.error("Erreur chargement tarifs :", e);
  } finally {
    loading.value = false;
  }
}

async function souscrire(type) {
  if (!auth.isAuthenticated) {
    router.push({ name: "login", query: { redirect: "/pricing" } });
    return;
  }

  try {
    const result = await paymentApi.initiate(type);
    alert(
      `Transaction créée !\n\n` +
      `Référence : ${result.reference}\n` +
      `Montant : ${result.montant} ${result.devise}\n\n` +
      `Suivez les instructions de paiement.`
    );
  } catch (e) {
    console.error(e);
    alert("Erreur lors de la création de la transaction");
  }
}

onMounted(loadTarifs);
</script>

<template>
  <div class="container-page py-8 sm:py-12">
    <div class="text-center mb-10 sm:mb-14">
      <h1 class="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-3">
        💳 Boostez votre recherche d'emploi
      </h1>
      <p class="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
        Mettez en avant votre profil et accédez en priorité aux meilleures offres
        d'emploi en Afrique de l'Ouest.
      </p>
    </div>

    <div v-if="loading" class="text-center py-16">
      <div class="w-8 h-8 mx-auto border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
    </div>

    <template v-else>
      <!-- Candidats -->
      <section class="mb-12 sm:mb-16">
        <h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
          👤 Pour les candidats
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div class="card flex flex-col">
            <div class="text-3xl sm:text-4xl mb-3">⭐</div>
            <h3 class="font-bold text-lg sm:text-xl mb-2">Boost d'offre</h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
              Mettez votre offre en avant pendant 30 jours en haut des résultats.
            </p>
            <div class="text-2xl sm:text-3xl font-bold text-brand-600 mb-4">
              {{ tarifs.premium_job?.prix || 2000 }} FCFA
            </div>
            <BaseButton class="w-full" @click="souscrire('premium_job')">
              Booster maintenant
            </BaseButton>
          </div>

          <div class="card flex flex-col border-2 border-brand-500 relative">
            <div class="absolute -top-3 left-4 bg-brand-500 text-white text-xs px-2 py-0.5 rounded font-semibold">
              ⭐ Recommandé
            </div>
            <div class="text-3xl sm:text-4xl mb-3">👑</div>
            <h3 class="font-bold text-lg sm:text-xl mb-2">Premium Candidat</h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
              Accès prioritaire aux nouvelles offres + alertes instantanées.
            </p>
            <div class="text-2xl sm:text-3xl font-bold text-brand-600 mb-4">
              {{ tarifs.subscription_premium?.prix || 5000 }} FCFA
              <span class="text-sm font-normal text-slate-500">/ mois</span>
            </div>
            <BaseButton class="w-full" @click="souscrire('subscription_premium')">
              Devenir Premium
            </BaseButton>
          </div>
        </div>
      </section>

      <!-- Entreprises -->
      <section class="mb-12 sm:mb-16">
        <h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
          🏢 Pour les entreprises
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div class="card flex flex-col">
            <div class="text-3xl sm:text-4xl mb-3">🎯</div>
            <h3 class="font-bold text-lg sm:text-xl mb-2">Offre sponsorisée</h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
              Votre offre en tête des résultats pendant 30 jours.
            </p>
            <div class="text-2xl sm:text-3xl font-bold text-brand-600 mb-4">
              {{ tarifs.sponsored_job?.prix || 25000 }} FCFA
            </div>
            <BaseButton variant="outline" class="w-full" @click="souscrire('sponsored_job')">
              Sponsoriser
            </BaseButton>
          </div>

          <div class="card flex flex-col">
            <div class="text-3xl sm:text-4xl mb-3">📢</div>
            <h3 class="font-bold text-lg sm:text-xl mb-2">Bannière publicitaire</h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
              Bannière visible sur la page d'accueil pendant 1 semaine.
            </p>
            <div class="text-2xl sm:text-3xl font-bold text-brand-600 mb-4">
              {{ tarifs.banner_week?.prix || 50000 }} FCFA
            </div>
            <BaseButton variant="outline" class="w-full" @click="souscrire('banner_week')">
              Acheter une bannière
            </BaseButton>
          </div>
        </div>
      </section>

      <!-- Moyens de paiement -->
      <section>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
          💳 Moyens de paiement disponibles
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div v-for="(methods, pays) in moyens" :key="pays" class="card">
            <h3 class="font-semibold text-slate-800 mb-3 text-sm sm:text-base">
              {{ pays }}
            </h3>
            <div class="flex flex-wrap gap-1.5 sm:gap-2">
              <span
                v-for="m in methods"
                :key="m.id"
                class="px-2 py-1 rounded bg-slate-100 text-xs text-slate-600"
              >
                {{ m.icone }} {{ m.label }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div class="mt-12 sm:mt-16 text-center card bg-gradient-to-br from-brand-50 to-white border-brand-100">
        <h2 class="text-lg sm:text-xl font-bold text-slate-800 mb-2">
          💬 Une question sur nos tarifs ?
        </h2>
        <p class="text-sm text-slate-500">
          Contactez-nous à <strong>contact@jobafrica.app</strong>
        </p>
      </div>
    </template>
  </div>
</template>
