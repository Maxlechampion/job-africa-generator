<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import ShareModal from "./ShareModal.vue";
import {
  supportsWebShare,
  nativeShare,
  copyToClipboard,
} from "@/services/share";
import shareApi from "@/services/share";

const props = defineProps({
  job: { type: Object, required: true },
  variant: { type: String, default: "button" },
});

const { t } = useI18n();

const showModal = ref(false);
const copied = ref(false);

async function handleShare() {
  const url = `${window.location.origin}/jobs/${props.job.id}`;

  if (supportsWebShare()) {
    const shared = await nativeShare(
      props.job.titre,
      `${props.job.titre} — ${props.job.entreprise || "Job Africa"}`,
      url
    );

    if (shared) {
      shareApi.track(props.job.id, "native");
      return;
    }
  }

  showModal.value = true;
}

async function quickCopy() {
  const url = `${window.location.origin}/jobs/${props.job.id}`;
  const ok = await copyToClipboard(url);

  if (ok) {
    copied.value = true;
    shareApi.track(props.job.id, "copy");
    setTimeout(() => (copied.value = false), 2000);
  }
}

function closeModal() {
  showModal.value = false;
}
</script>

<template>
  <div class="relative inline-flex">
    <button
      v-if="variant === 'icon'"
      class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
      :title="t('common.share', 'Partager')"
      @click="handleShare"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    </button>

    <button
      v-else
      class="btn border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 text-sm inline-flex items-center gap-2"
      @click="handleShare"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      <span>{{ copied ? "✓ Copié !" : t("common.share", "Partager") }}</span>
    </button>

    <ShareModal v-if="showModal" :job="job" @close="closeModal" />
  </div>
</template>
