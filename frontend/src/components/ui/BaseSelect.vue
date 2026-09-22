<script setup>
defineProps({
  modelValue: [String, Number, null],
  label: String,
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: "Tous" },
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
    <select
      :value="modelValue"
      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition"
      @change="$emit('update:modelValue', $event.target.value || null)"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt" :value="opt">
        {{ opt }}
      </option>
    </select>
  </label>
</template>
