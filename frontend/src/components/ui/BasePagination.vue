<script setup>
import { computed } from "vue";

const props = defineProps({
  total: { type: Number, default: 0 },
  limit: { type: Number, default: 12 },
  offset: { type: Number, default: 0 },
});
const emit = defineEmits(["change"]);

const currentPage = computed(() => Math.floor(props.offset / props.limit) + 1);
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)));

function go(page) {
  if (page < 1 || page > totalPages.value) return;
  emit("change", (page - 1) * props.limit);
}

const pages = computed(() => {
  const arr = [];
  const total = totalPages.value;
  const cur = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) arr.push(i);
  } else {
    arr.push(1);
    if (cur > 3) arr.push("…");
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) {
      arr.push(i);
    }
    if (cur < total - 2) arr.push("…");
    arr.push(total);
  }
  return arr;
});
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center justify-center gap-1 mt-10">
    <button
      class="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      :disabled="currentPage === 1"
      @click="go(currentPage - 1)"
    >
      ‹ Precedent
    </button>

    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '…'" class="px-2 text-slate-400">…</span>
      <button
        v-else
        :class="[
          'px-3 py-1.5 rounded-md text-sm transition',
          p === currentPage
            ? 'bg-brand-500 text-white font-semibold'
            : 'text-slate-600 hover:bg-slate-100',
        ]"
        @click="go(p)"
      >
        {{ p }}
      </button>
    </template>

    <button
      class="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      :disabled="currentPage === totalPages"
      @click="go(currentPage + 1)"
    >
      Suivant ›
    </button>
  </div>
</template>
