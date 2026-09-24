<script setup>
import AppLayout from "@/components/layout/AppLayout.vue";
import PushPrompt from "@/components/pwa/PushPrompt.vue";
import InstallPrompt from "@/components/pwa/InstallPrompt.vue";
import UpdatePrompt from "@/components/pwa/UpdatePrompt.vue";
import OfflineIndicator from "@/components/pwa/OfflineIndicator.vue";

import ToastContainer from "@/components/ui/ToastContainer.vue";
</script>

<template>
  <div>
    <OfflineIndicator />
    <AppLayout />
    <InstallPrompt />
    <UpdatePrompt />
    <PushPrompt />
    <ToastContainer />
</div>
</template>
