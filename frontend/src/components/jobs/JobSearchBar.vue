<script setup>
import { ref, onMounted } from "vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps({
  initialQuery: { type: String, default: "" },
});
const emit = defineEmits(["search"]);

const q = ref(props.initialQuery);

function submit() {
  emit("search", q.value.trim());
}

onMounted(() => {
  q.value = props.initialQuery;
});
</script>

<template>
  <form
    class="card p-2 flex flex-col sm:flex-row gap-2 items-stretch"
    @submit.prevent="submit"
  >
    <div class="flex-1">
      <BaseInput
        v-model="q"
        placeholder="Mot-cle : developpeur, marketing, comptable…"
      />
    </div>
    <BaseButton type="submit" size="lg">🔎 Rechercher</BaseButton>
  </form>
</template>
