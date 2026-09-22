<script setup>
import BaseButton from "@/components/ui/BaseButton.vue";
</script>

<template>
  <div class="container-page py-24 text-center">
    <div class="text-7xl mb-6">🌍</div>
    <h1 class="text-3xl font-bold text-slate-800">Page introuvable</h1>
    <p class="text-slate-500 mt-2">
      La page que vous recherchez n'existe pas.
    </p>
    <div class="mt-6">
      <RouterLink to="/">
        <BaseButton size="lg">Retour a l'accueil</BaseButton>
      </RouterLink>
    </div>
  </div>
</template>
