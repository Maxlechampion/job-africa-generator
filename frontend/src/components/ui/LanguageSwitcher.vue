<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { setLocale, availableLocales } from "@/i18n";

const { locale } = useI18n();
const open = ref(false);

const current = computed(() =>
  availableLocales.find((l) => l.code === locale.value) || availableLocales[0]
);

function change(code) {
  setLocale(code);
  open.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
      @click="open = !open"
      aria-label="Change language"
    >
      <span class="text-base">{{ current.flag }}</span>
      <span class="hidden sm:inline font-medium uppercase">{{ current.code }}</span>
      <svg
        class="w-3 h-3 transition"
        :class="open && 'rotate-180'"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-40 card p-1 shadow-lg z-50"
      @click.stop
    >
      <button
        v-for="l in availableLocales"
        :key="l.code"
        :class="[
          'flex items-center gap-2 w-full px-3 py-2 text-sm rounded transition',
          l.code === locale
            ? 'bg-brand-50 text-brand-700 font-medium'
            : 'hover:bg-slate-50 text-slate-700',
        ]"
        @click="change(l.code)"
      >
        <span class="text-base">{{ l.flag }}</span>
        <span>{{ l.label }}</span>
      </button>
    </div>
  </div>
</template>
