<script setup>
defineProps({
  title: { type: String, default: "Aucun resultat" },
  description: { type: String, default: "" },
});
</script>

<template>
  <div class="text-center py-16">
    <div class="text-5xl mb-4">🔍</div>
    <h3 class="text-lg font-semibold text-slate-800">{{ title }}</h3>
    <p v-if="description" class="text-sm text-slate-500 mt-2 max-w-md mx-auto">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
