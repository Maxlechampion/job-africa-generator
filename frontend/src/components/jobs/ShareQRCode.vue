<script setup>
import { ref, onMounted, watch } from "vue";
import QRCode from "qrcode";

const props = defineProps({
  url: { type: String, required: true },
  title: { type: String, default: "" },
});

const canvasRef = ref(null);

async function generate() {
  if (!canvasRef.value || !props.url) return;

  try {
    await QRCode.toCanvas(canvasRef.value, props.url, {
      width: 220,
      margin: 1,
      color: { dark: "#1e293b", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch (e) {
    console.error("Erreur QR Code :", e);
  }
}

function download() {
  if (!canvasRef.value) return;
  const link = document.createElement("a");
  link.download = `job-africa-${props.title || "offre"}.png`;
  link.href = canvasRef.value.toDataURL("image/png");
  link.click();
}

onMounted(generate);
watch(() => props.url, generate);
</script>

<template>
  <div class="text-center">
    <div class="bg-white p-3 rounded-xl border border-slate-200 inline-block">
      <canvas ref="canvasRef"></canvas>
    </div>
    <div class="mt-3">
      <button class="text-xs text-slate-500 hover:text-brand-600 transition" @click="download">
        ⬇️ Télécharger le QR Code
      </button>
    </div>
    <p class="text-xs text-slate-400 mt-2 max-w-[220px] mx-auto">
      Scannez avec votre téléphone pour ouvrir l'offre
    </p>
  </div>
</template>
