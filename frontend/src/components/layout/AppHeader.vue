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
  { to: "/", labelKey: "nav.home" },
  { to: "/jobs", labelKey: "nav.jobs" },
  { to: "/stats", labelKey: "nav.stats" },
];
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-40">
    <div class="container-page flex items-center justify-between h-16">
      <RouterLink to="/" class="flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">
          JA
        </span>
        <span class="font-bold text-lg text-slate-800">{{ t("common.app_name") }}</span>
      </RouterLink>

      <nav class="hidden md:flex items-center gap-6">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="text-sm font-medium text-slate-600 hover:text-brand-600 transition"
          active-class="text-brand-600"
        >
          {{ t(l.labelKey) }}
        </RouterLink>

        <LanguageSwitcher />

        <template v-if="auth.isAuthenticated">
          <div class="relative">
            <button
              class="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-brand-600"
              @click="menuOpen = !menuOpen"
            >
              <span class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
                {{ auth.userEmail.charAt(0).toUpperCase() }}
              </span>
            </button>

            <div
              v-if="menuOpen"
              class="absolute right-0 mt-2 w-48 card p-1 shadow-lg z-50"
              @click="menuOpen = false"
            >
              <RouterLink to="/account" class="block px-3 py-2 text-sm hover:bg-slate-50 rounded">
                {{ t("nav.account") }}
              </RouterLink>
              <RouterLink
                v-if="auth.isAdmin"
                to="/admin"
                class="block px-3 py-2 text-sm hover:bg-slate-50 rounded text-brand-600 font-medium"
              >
                👑 {{ t("nav.admin") }}
              </RouterLink>
              <button
                class="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded text-red-600"
                @click="auth.logout()"
              >
                {{ t("nav.logout") }}
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <RouterLink to="/login" class="text-sm font-medium text-slate-600 hover:text-brand-600">
            {{ t("nav.login") }}
          </RouterLink>
          <RouterLink to="/signup" class="btn bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm">
            {{ t("nav.signup") }}
          </RouterLink>
        </template>
      </nav>

      <button class="md:hidden p-2" @click="open = !open">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <div v-if="open" class="md:hidden border-t border-slate-200 bg-white">
      <nav class="container-page py-4 flex flex-col gap-3">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="text-sm font-medium text-slate-700"
          @click="open = false"
        >
          {{ t(l.labelKey) }}
        </RouterLink>
        <LanguageSwitcher />
      </nav>
    </div>
  </header>
</template>