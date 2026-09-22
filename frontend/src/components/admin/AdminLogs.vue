<script setup>
import { timeAgo } from "@/utils/format";

defineProps({
  logs: { type: Array, default: () => [] },
});

const statusColors = {
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
  partial: "bg-amber-50 text-amber-700",
};
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      📋 Dernieres collectes
    </h3>

    <div v-if="!logs.length" class="text-sm text-slate-500 py-4">
      Aucun log.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="l in logs"
        :key="l.id"
        class="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
      >
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-800 truncate">
            {{ l.source_nom || "—" }}
          </div>
          <div class="text-xs text-slate-400">
            {{ timeAgo(l.created_at) }}
            <span v-if="l.duree_secondes">
              · {{ l.duree_secondes.toFixed(1) }}s
            </span>
          </div>
        </div>

        <div class="text-right text-xs">
          <span
            :class="[
              'px-2 py-0.5 rounded',
              statusColors[l.statut] || 'bg-slate-100',
            ]"
          >
            {{ l.statut }}
          </span>
          <div class="text-slate-500 mt-1">
            +{{ l.offres_inserees }} / {{ l.offres_collectees }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
