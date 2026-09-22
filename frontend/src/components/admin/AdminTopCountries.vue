<script setup>
import { computed } from "vue";
import { countryFlag } from "@/utils/format";

const props = defineProps({
  countries: { type: Array, default: () => [] },
});

const max = computed(() =>
  Math.max(...props.countries.map((c) => c.total), 1)
);
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      🌍 Top pays
    </h3>

    <div v-if="!countries.length" class="text-sm text-slate-500 py-4">
      Aucune donnee.
    </div>

    <div v-else class="space-y-3">
      <div v-for="c in countries" :key="c.label">
        <div class="flex items-center justify-between text-sm mb-1">
          <span class="font-medium text-slate-700">
            {{ countryFlag(c.label) }} {{ c.label }}
          </span>
          <span class="text-slate-500 text-xs">{{ c.total }}</span>
        </div>
        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-amber-500 rounded-full transition-all"
            :style="{ width: (c.total / max) * 100 + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
