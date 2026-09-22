<script setup>
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

const props = defineProps({
  data: { type: Array, default: () => [] },
});

const chartData = computed(() => ({
  labels: props.data.map((d) => {
    const date = new Date(d.jour);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  }),
  datasets: [
    {
      label: "Offres / jour",
      data: props.data.map((d) => d.total),
      borderColor: "#2f8f5c",
      backgroundColor: "rgba(47, 143, 92, 0.1)",
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "#f1f5f9" },
      ticks: { color: "#94a3b8", font: { size: 11 } },
    },
    x: {
      grid: { display: false },
      ticks: { color: "#94a3b8", font: { size: 11 } },
    },
  },
};
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      📈 Offres collectees (30 derniers jours)
    </h3>
    <div style="height: 280px">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
