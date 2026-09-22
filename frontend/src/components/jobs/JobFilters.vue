<script setup>
import { onMounted } from "vue";
import BaseSelect from "@/components/ui/BaseSelect.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import { useFiltersStore } from "@/stores/filters";
import { CONTRACT_TYPES } from "@/utils/constants";

const props = defineProps({
  modelValue: { type: Object, required: true },
});
const emit = defineEmits(["update:modelValue", "reset"]);

const store = useFiltersStore();

onMounted(() => store.loadReferentials());

function update(field, value) {
  emit("update:modelValue", { ...props.modelValue, [field]: value });
}
</script>

<template>
  <aside class="card p-5 space-y-4 sticky top-20">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-slate-800">Filtres</h3>
      <BaseButton variant="ghost" size="sm" @click="$emit('reset')">
        Reinitialiser
      </BaseButton>
    </div>

    <BaseSelect
      label="Pays"
      :model-value="modelValue.pays"
      :options="store.countries"
      placeholder="Tous les pays"
      @update:model-value="(v) => update('pays', v)"
    />

    <BaseSelect
      label="Categorie"
      :model-value="modelValue.categorie"
      :options="store.categories"
      placeholder="Toutes"
      @update:model-value="(v) => update('categorie', v)"
    />

    <BaseSelect
      label="Type de contrat"
      :model-value="modelValue.type_contrat"
      :options="CONTRACT_TYPES"
      placeholder="Tous"
      @update:model-value="(v) => update('type_contrat', v)"
    />

    <BaseSelect
      label="Teletravail"
      :model-value="
        modelValue.teletravail === null || modelValue.teletravail === undefined
          ? ''
          : String(modelValue.teletravail)
      "
      :options="['true', 'false']"
      placeholder="Indifferent"
      @update:model-value="
        (v) => update('teletravail', v === '' ? null : v === 'true')
      "
    />

    <div class="pt-2 text-xs text-slate-400 border-t border-slate-100">
      Les filtres s'appliquent automatiquement.
    </div>
  </aside>
</template>
