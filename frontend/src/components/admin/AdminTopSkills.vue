<script setup>
import { computed } from "vue";

const props = defineProps({
  skills: { type: Array, default: () => [] },
});

const max = computed(() =>
  Math.max(...props.skills.map((s) => s.total), 1)
);
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      🧠 Top competences
    </h3>

    <div v-if="!skills.length" class="text-sm text-slate-500 py-4">
      Aucune donnee.
    </div>

    <div v-else class="space-y-3">
      <div v-for="s in skills" :key="s.label">
        <div class="flex items-center justify-between text-sm mb-1">
          <span class="font-medium text-slate-700 truncate">
            {{ s.label }}
          </span>
          <span class="text-slate-500 text-xs">{{ s.total }}</span>
        </div>
        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-brand-500 rounded-full transition-all"
            :style="{ width: (s.total / max) * 100 + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
