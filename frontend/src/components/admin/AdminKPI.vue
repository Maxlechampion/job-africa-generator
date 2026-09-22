<script setup>
defineProps({
  kpi: { type: Object, required: true },
});

const cards = [
  { key: "total_offres", label: "Offres totales", icon: "💼", color: "brand" },
  { key: "offres_7j", label: "Offres 7 jours", icon: "📈", color: "sky" },
  { key: "total_sources_actives", label: "Sources actives", icon: "📡", color: "emerald" },
  { key: "total_skills", label: "Competences", icon: "🧠", color: "amber" },
  { key: "total_companies", label: "Entreprises", icon: "🏢", color: "purple" },
  { key: "offres_30j", label: "Offres 30 jours", icon: "📊", color: "rose" },
];

const colors = {
  brand: "bg-brand-50 text-brand-700",
  sky: "bg-sky-50 text-sky-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  purple: "bg-purple-50 text-purple-700",
  rose: "bg-rose-50 text-rose-700",
};
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    <div v-for="c in cards" :key="c.key" class="card p-4">
      <div
        :class="['w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-2', colors[c.color]]"
      >
        {{ c.icon }}
      </div>
      <div class="text-2xl font-bold text-slate-800">
        {{ kpi[c.key] ?? "—" }}
      </div>
      <div class="text-xs text-slate-500 mt-0.5">{{ c.label }}</div>
    </div>
  </div>
</template>
