<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import pushApi from "@/services/push";

const auth = useAuthStore();

const showPrompt = ref(false);
const permission = ref("default");
const loading = ref(false);
const subscribed = ref(false);
const isSupported = ref(false);

async function checkStatus() {
  isSupported.value = pushApi.isSupported();

  if (!isSupported.value) return;

  permission.value = pushApi.getPermission();

  const sub = await pushApi.getSubscription();
  subscribed.value = !!sub;

  if (auth.isAuthenticated && permission.value === "default" && !subscribed.value) {
    setTimeout(() => {
      showPrompt.value = true;
    }, 5000);
  }
}

async function enable() {
  loading.value = true;

  try {
    await pushApi.requestAndSubscribe();
    subscribed.value = true;
    permission.value = "granted";
    showPrompt.value = false;
  } catch (e) {
    console.error("Erreur activation push:", e);
    permission.value = pushApi.getPermission();
  } finally {
    loading.value = false;
  }
}

function dismiss() {
  showPrompt.value = false;
  localStorage.setItem("push-dismissed", Date.now().toString());
}

function checkDismissed() {
  const last = localStorage.getItem("push-dismissed");
  if (!last) return false;

  const days = (Date.now() - parseInt(last)) / (1000 * 60 * 60 * 24);
  return days < 14;
}

onMounted(() => {
  if (!checkDismissed()) {
    checkStatus();
  }
});
</script>

<template>
  <div
    v-if="showPrompt"
    class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 card p-4 shadow-lg border-brand-200 bg-gradient-to-br from-brand-50 to-white"
  >
    <div class="flex items-start gap-3">
      <div class="text-3xl">🔔</div>
      <div class="flex-1">
        <div class="font-semibold text-slate-800">
          Activer les notifications
        </div>
        <p class="text-xs text-slate-500 mt-1">
          Recevez une alerte dès qu'une nouvelle offre correspond à vos critères.
        </p>
        <div class="flex gap-2 mt-3">
          <button
            class="btn bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
            :disabled="loading"
            @click="enable"
          >
            {{ loading ? "Activation…" : "Activer" }}
          </button>
          <button
            class="text-xs text-slate-500 hover:text-slate-700 px-2"
            @click="dismiss"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
