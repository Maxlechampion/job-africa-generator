<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import ShareQRCode from "./ShareQRCode.vue";
import { SHARE_CHANNELS, copyToClipboard } from "@/services/share";
import shareApi from "@/services/share";

const props = defineProps({
  job: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const { t } = useI18n();

const urls = ref(null);
const copied = ref(false);
const loading = ref(true);
const showQR = ref(false);

async function loadUrls() {
  try {
    urls.value = await shareApi.getUrls(props.job.id);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function shareVia(canal) {
  if (!urls.value) return;
  const url = urls.value[canal];
  if (!url) return;

  window.open(url, "_blank", "noopener,noreferrer,width=600,height=700");
  shareApi.track(props.job.id, canal);
  setTimeout(() => emit("close"), 300);
}

async function copyLink() {
  if (!urls.value) return;
  const ok = await copyToClipboard(urls.value.url);
  if (ok) {
    copied.value = true;
    shareApi.track(props.job.id, "copy");
    setTimeout(() => (copied.value = false), 2000);
  }
}

function handleKeydown(e) {
  if (e.key === "Escape") emit("close");
}

onMounted(() => {
  loadUrls();
  document.addEventListener("keydown", handleKeydown);
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between p-5 border-b border-slate-100">
        <div>
          <h2 class="font-semibold text-slate-800">Partager cette offre</h2>
          <p class="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{{ job.titre }}</p>
        </div>
        <button
          class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          @click="emit('close')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div v-if="loading" class="p-8 text-center">
        <div class="w-8 h-8 mx-auto border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <div class="p-5">
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="c in SHARE_CHANNELS"
              :key="c.key"
              :class="['flex flex-col items-center gap-2 p-4 rounded-xl transition border border-slate-100', c.color]"
              @click="shareVia(c.key)"
            >
              <span class="text-2xl">{{ c.icon }}</span>
              <span class="text-xs font-medium text-slate-700">{{ c.label }}</span>
            </button>
          </div>

          <div class="mt-4">
            <div class="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="text"
                :value="urls?.url"
                readonly
                class="flex-1 bg-transparent text-xs text-slate-600 outline-none truncate"
              />
              <button
                class="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition whitespace-nowrap"
                @click="copyLink"
              >
                {{ copied ? "✓ Copié" : "Copier" }}
              </button>
            </div>
          </div>

          <button
            class="w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 hover:text-brand-600 transition"
            @click="showQR = !showQR"
          >
            <span>📱</span>
            <span>{{ showQR ? "Masquer le QR Code" : "Afficher le QR Code" }}</span>
          </button>

          <div v-if="showQR" class="mt-4 flex justify-center">
            <ShareQRCode :url="urls?.url" :title="job.titre" />
          </div>
        </div>

        <div class="px-5 pb-5 text-center">
          <p class="text-xs text-slate-400">
            Partagez cette offre avec votre réseau pour aider d'autres candidats.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
