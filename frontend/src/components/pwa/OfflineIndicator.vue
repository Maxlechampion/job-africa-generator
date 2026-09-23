<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const isOnline = ref(navigator.onLine);

function updateStatus() {
  isOnline.value = navigator.onLine;
}

onMounted(() => {
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
});

onUnmounted(() => {
  window.removeEventListener("online", updateStatus);
  window.removeEventListener("offline", updateStatus);
});
</script>

<template>
  <Transition name="fade">
    <div
      v-if="!isOnline"
      class="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-xs py-2 px-4"
    >
      📡 Vous êtes hors-ligne — affichage des données en cache
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
