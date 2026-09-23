<script setup>
import { ref, onMounted } from "vue";

const showUpdate = ref(false);
const updating = ref(false);

function handleUpdate() {
  showUpdate.value = true;
}

async function applyUpdate() {
  updating.value = true;
  if (typeof window.__updateSW === "function") {
    await window.__updateSW(true);
  } else {
    window.location.reload();
  }
}

function dismiss() {
  showUpdate.value = false;
}

onMounted(() => {
  window.addEventListener("pwa:update-available", handleUpdate);
});
</script>

<template>
  <div
    v-if="showUpdate"
    class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 card p-4 shadow-lg border-amber-200 bg-amber-50"
  >
    <div class="flex items-start gap-3">
      <div class="text-2xl">🔄</div>
      <div class="flex-1">
        <div class="font-semibold text-slate-800 text-sm">Mise à jour disponible</div>
        <p class="text-xs text-slate-600 mt-1">
          Une nouvelle version de Job Africa est prête.
        </p>
        <div class="flex gap-2 mt-3">
          <button
            class="btn bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 text-xs"
            :disabled="updating"
            @click="applyUpdate"
          >
            {{ updating ? "Mise à jour…" : "Mettre à jour" }}
          </button>
          <button class="text-xs text-slate-500 hover:text-slate-700 px-2" @click="dismiss">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
