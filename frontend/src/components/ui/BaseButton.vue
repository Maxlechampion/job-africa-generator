<script setup>
defineProps({
  variant: { type: String, default: "primary" },
  size: { type: String, default: "md" },
  disabled: { type: Boolean, default: false },
});

const variants = {
  primary: "bg-brand-500 hover:bg-brand-600 text-white",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800",
  outline: "border border-slate-300 hover:bg-slate-50 text-slate-700",
  ghost: "hover:bg-slate-100 text-slate-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};
</script>

<template>
  <button
    :class="[
      'btn',
      variants[variant],
      sizes[size],
      disabled && 'opacity-50 cursor-not-allowed',
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
