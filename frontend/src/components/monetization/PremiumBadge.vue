<script setup>
defineProps({
  size: { type: String, default: "sm" },
});

const sizes = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-md font-semibold',
      'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm',
      sizes[size],
    ]"
  >
    ⭐ Premium
  </span>
</template>
