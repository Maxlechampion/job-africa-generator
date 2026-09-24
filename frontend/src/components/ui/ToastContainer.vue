<script setup>
import { computed } from "vue";
import { useToastStore } from "@/stores/toast";

const store = useToastStore();
const toasts = computed(() => store.toasts);

const styles = {
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "✅", title: "text-emerald-900", text: "text-emerald-700" },
  error:   { bg: "bg-red-50",     border: "border-red-200",     icon: "❌", title: "text-red-900",     text: "text-red-700" },
  warning: { bg: "bg-amber-50",   border: "border-amber-200",   icon: "⚠️", title: "text-amber-900",   text: "text-amber-700" },
  info:    { bg: "bg-sky-50",     border: "border-sky-200",     icon: "ℹ️", title: "text-sky-900",     text: "text-sky-700" },
  payment: { bg: "bg-brand-50",   border: "border-brand-200",   icon: "💳", title: "text-brand-900",   text: "text-brand-700" },
};

function getStyle(type) {
  return styles[type] || styles.info;
}

function handleAction(toast, action) {
  if (action.handler) action.handler();
  if (action.dismiss) store.remove(toast.id);
}
</script>

<template>
  <div
    class="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none"
    style="max-width: 420px; width: calc(100% - 2rem)"
  >
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-x-full opacity-0"
      enter-to-class="transform translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-x-0 opacity-100"
      leave-to-class="transform translate-x-full opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'card p-4 shadow-lg border pointer-events-auto',
          getStyle(toast.type).bg,
          getStyle(toast.type).border,
        ]"
      >
        <div class="flex items-start gap-3">
          <div class="text-2xl flex-shrink-0">
            {{ getStyle(toast.type).icon }}
          </div>

          <div class="flex-1 min-w-0">
            <h4 :class="['font-semibold text-sm', getStyle(toast.type).title]">
              {{ toast.title }}
            </h4>

            <p
              v-if="!toast.data"
              :class="['text-xs mt-1', getStyle(toast.type).text]"
            >
              {{ toast.message }}
            </p>

            <div v-else class="mt-2 space-y-1">
              <div :class="['flex items-center justify-between text-xs', getStyle(toast.type).text]">
                <span>Référence</span>
                <code class="font-mono font-semibold px-2 py-0.5 rounded bg-white/60">
                  {{ toast.data.reference }}
                </code>
              </div>
              <div :class="['flex items-center justify-between text-xs', getStyle(toast.type).text]">
                <span>Montant</span>
                <span class="font-semibold">
                  {{ toast.data.montant }} {{ toast.data.devise }}
                </span>
              </div>
              <p :class="['text-xs mt-2 leading-relaxed', getStyle(toast.type).text]">
                {{ toast.message }}
              </p>
            </div>
          </div>

          <button
            class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/60 flex-shrink-0"
            @click="store.remove(toast.id)"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          v-if="toast.actions && toast.actions.length > 0"
          class="flex gap-2 mt-3 pl-9"
        >
          <button
            v-for="(action, i) in toast.actions"
            :key="i"
            :class="[
              'text-xs px-3 py-1.5 rounded-lg font-medium transition',
              action.primary
                ? 'bg-brand-500 hover:bg-brand-600 text-white'
                : 'bg-white/70 hover:bg-white text-slate-700 border border-slate-200',
            ]"
            @click="handleAction(toast, action)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
