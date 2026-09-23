<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher.vue";

const { t } = useI18n();
const auth = useAuthStore();

const open = ref(false);
const menuOpen = ref(false);

const links = [
  { to: "/", label: "Accueil" },
  { to: "/jobs", label: "Offres" },
  { to: "/stats", label: "Statistiques" },
];
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-40 safe-top">
    <div class="container-page flex items-center justify-between h-14 sm:h-16">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-2 shrink-0">
        <span class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
          JA
        </span>
        <span class="font-bold text-base sm:text-lg text-slate-800">
          Job Africa
        </span>
      </RouterLink>

      <!-- Navigation desktop -->
      <nav class="hidden md:flex items-center gap-4 lg:gap-6">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="text-sm font-medium text-slate-600 hover:text-brand-600 transition"
          active-class="text-brand-600"
        >
          {{ l.label }}
        </RouterLink>

        <LanguageSwitcher />

        <!-- Auth -->
        <template v-if="auth.isAuthenticated">
          <div class="relative">
            <button
              class="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-brand-600"
              @click="menuOpen = !menuOpen"
            >
              <span class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
                {{ auth.userEmail.charAt(0).toUpperCase() }}
              </span>
            </button>

            <div
              v-if="menuOpen"
              class="absolute right-0 mt-2 w-48 card p-1 shadow-lg"
              @click="menuOpen = false"
            >
              <RouterLink to="/account" class="block px-3 py-2 text-sm hover:bg-slate-50 rounded">
                Mon compte
              </RouterLink>
              <RouterLink to="/favorites" class="block px-3 py-2 text-sm hover:bg-slate-50 rounded">
                Mes favoris
              </RouterLink>
              <RouterLink to="/alerts" class="block px-3 py-2 text-sm hover:bg-slate-50 rounded">
                Mes alertes
              </RouterLink>
              <RouterLink
                v-if="auth.isAdmin"
                to="/admin"
                class="block px-3 py-2 text-sm hover:bg-slate-50 rounded text-brand-600 font-medium"
              >
                👑 Admin
              </RouterLink>
              <button
                class="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded text-red-600"
                @click="auth.logout()"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <RouterLink
            to="/login"
            class="text-sm font-medium text-slate-600 hover:text-brand-600"
          >
            Connexion
          </RouterLink>
          <RouterLink
            to="/signup"
            class="btn bg-brand-500 hover:bg-brand-600 text-white text-sm px-4"
          >
            S'inscrire
          </RouterLink>
        </template>
      </nav>

      <!-- Menu mobile -->
      <div class="flex items-center gap-2 md:hidden">
        <LanguageSwitcher />

        <button
          class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-100"
          @click="open = !open"
          aria-label="Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Menu mobile ouvert -->
    <Transition name="slide-down">
      <div v-if="open" class="md:hidden border-t border-slate-200 bg-white">
        <nav class="container-page py-4 flex flex-col gap-1">
          <RouterLink
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            class="px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            @click="open = false"
          >
            {{ l.label }}
          </RouterLink>

          <div class="border-t border-slate-100 mt-2 pt-2">
            <template v-if="auth.isAuthenticated">
              <RouterLink
                to="/account"
                class="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                @click="open = false"
              >
                Mon compte
              </RouterLink>
              <RouterLink
                to="/favorites"
                class="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                @click="open = false"
              >
                Mes favoris
              </RouterLink>
              <RouterLink
                to="/alerts"
                class="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                @click="open = false"
              >
                Mes alertes
              </RouterLink>
              <button
                class="block w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                @click="auth.logout(); open = false"
              >
                Déconnexion
              </button>
            </template>
            <template v-else>
              <RouterLink
                to="/login"
                class="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                @click="open = false"
              >
                Connexion
              </RouterLink>
              <RouterLink
                to="/signup"
                class="block px-4 py-3 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg text-center"
                @click="open = false"
              >
                S'inscrire
              </RouterLink>
            </template>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>