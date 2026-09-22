<script setup>
defineProps({
  modelValue: [String, Number],
  label: String,
  placeholder: String,
  type: { type: String, default: "text" },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <label class="block">
    <span
      v-if="label"
      class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"
    >
      {{ label }}
    </span>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>
