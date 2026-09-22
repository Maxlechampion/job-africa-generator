<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import BaseInput from "@/components/ui/BaseInput.vue";
import BaseButton from "@/components/ui/BaseButton.vue";

const auth = useAuthStore();
const router = useRouter();

const form = reactive({ email: "", password: "", nom: "" });
const error = ref("");
const success = ref(false);
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;

  const result = await auth.signup(form.email, form.password, form.nom);

  loading.value = false;

  if (result.success) {
    success.value = true;
  } else {
    error.value = result.error || "Erreur d'inscription";
  }
}
</script>

<template>
  <div class="container-page py-12 max-w-md">
    <div class="card p-8">
      <div v-if="success" class="text-center">
        <div class="text-5xl mb-4">📧</div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">
          Verifiez votre email
        </h2>
        <p class="text-sm text-slate-500">
          Un lien de confirmation a ete envoye a <strong>{{ form.email }}</strong>.
          Cliquez dessus pour activer votre compte.
        </p>
        <RouterLink to="/login" class="text-brand-600 hover:underline text-sm mt-4 inline-block">
          Retour a la connexion
        </RouterLink>
      </div>

      <template v-else>
        <h1 class="text-2xl font-bold text-slate-800 mb-2">Inscription</h1>
        <p class="text-sm text-slate-500 mb-6">
          Creez votre compte gratuitement.
        </p>

        <form class="space-y-4" @submit.prevent="submit">
          <BaseInput v-model="form.nom" label="Nom (optionnel)" />
          <BaseInput
            v-model="form.email"
            label="Email"
            type="email"
            placeholder="vous@exemple.com"
          />
          <BaseInput
            v-model="form.password"
            label="Mot de passe"
            type="password"
            placeholder="8 caracteres minimum"
          />

          <div v-if="error" class="text-sm text-red-600 bg-red-50 p-2 rounded">
            {{ error }}
          </div>

          <BaseButton type="submit" size="lg" class="w-full" :disabled="loading">
            {{ loading ? "Creation…" : "Creer mon compte" }}
          </BaseButton>
        </form>

        <div class="mt-6 text-center text-sm text-slate-500">
          Deja un compte ?
          <RouterLink to="/login" class="text-brand-600 hover:underline font-medium">
            Se connecter
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>
