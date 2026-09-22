<script setup>
import { reactive, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import BaseInput from "@/components/ui/BaseInput.vue";
import BaseButton from "@/components/ui/BaseButton.vue";

const auth = useAuthStore();

const form = reactive({ email: "", password: "" });
const error = ref("");
const success = ref(false);
const loading = ref(false);
const isUpdate = ref(false);

if (window.location.hash.includes("type=recovery")) {
  isUpdate.value = true;
}

async function sendReset() {
  error.value = "";
  loading.value = true;
  const result = await auth.resetPassword(form.email);
  loading.value = false;

  if (result.success) success.value = true;
  else error.value = result.error;
}

async function updatePassword() {
  error.value = "";
  loading.value = true;
  const result = await auth.updatePassword(form.password);
  loading.value = false;

  if (result.success) success.value = true;
  else error.value = result.error;
}
</script>

<template>
  <div class="container-page py-12 max-w-md">
    <div class="card p-8">
      <div v-if="success" class="text-center">
        <div class="text-5xl mb-4">✅</div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">
          {{ isUpdate ? "Mot de passe mis a jour" : "Email envoye" }}
        </h2>
        <RouterLink to="/login" class="text-brand-600 hover:underline text-sm">
          Retour a la connexion
        </RouterLink>
      </div>

      <template v-else>
        <h1 class="text-2xl font-bold text-slate-800 mb-2">
          {{ isUpdate ? "Nouveau mot de passe" : "Mot de passe oublie" }}
        </h1>

        <form
          class="space-y-4 mt-6"
          @submit.prevent="isUpdate ? updatePassword() : sendReset()"
        >
          <BaseInput
            v-if="!isUpdate"
            v-model="form.email"
            label="Email"
            type="email"
          />
          <BaseInput
            v-else
            v-model="form.password"
            label="Nouveau mot de passe"
            type="password"
          />

          <div v-if="error" class="text-sm text-red-600 bg-red-50 p-2 rounded">
            {{ error }}
          </div>

          <BaseButton type="submit" size="lg" class="w-full" :disabled="loading">
            {{ loading ? "Envoi…" : isUpdate ? "Mettre a jour" : "Envoyer le lien" }}
          </BaseButton>
        </form>
      </template>
    </div>
  </div>
</template>
