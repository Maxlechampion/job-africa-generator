<script setup>
defineProps({
  variant: { type: String, default: "default" },
});

const variants = {
  default: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700",
  accent: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-sky-50 text-sky-700",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
      variants[variant],
    ]"
  >
    <slot />
  </span>
</template>
