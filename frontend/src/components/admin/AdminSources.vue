<script setup>
import { timeAgo } from "@/utils/format";

defineProps({
  sources: { type: Array, default: () => [] },
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
      📡 Sources
    </h3>

    <div v-if="!sources.length" class="text-sm text-slate-500 py-4">
      Aucune source.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
            <th class="py-2 pr-3">Nom</th>
            <th class="py-2 pr-3">Type</th>
            <th class="py-2 pr-3">Statut</th>
            <th class="py-2 pr-3">Derniere</th>
            <th class="py-2 pr-3 text-right">Offres</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in sources"
            :key="s.id"
            class="border-b border-slate-50 last:border-0"
          >
            <td class="py-3 pr-3 font-medium text-slate-800">{{ s.nom }}</td>
            <td class="py-3 pr-3">
              <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                {{ s.type }}
              </span>
            </td>
            <td class="py-3 pr-3">
              <span
                :class="[
                  'px-2 py-0.5 rounded text-xs',
                  statusColors[s.dernier_statut] || 'bg-slate-100 text-slate-500',
                ]"
              >
                {{ s.dernier_statut || "—" }}
              </span>
            </td>
            <td class="py-3 pr-3 text-slate-500 text-xs">
              {{ s.derniere_collecte ? timeAgo(s.derniere_collecte) : "Jamais" }}
            </td>
            <td class="py-3 pr-3 text-right font-medium">
              {{ s.nombre_offres_total }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
