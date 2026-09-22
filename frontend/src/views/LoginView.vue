<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import BaseInput from "@/components/ui/BaseInput.vue";
import BaseButton from "@/components/ui/BaseButton.vue";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({ email: "", password: "" });
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;

  const result = await auth.login(form.email, form.password);

  loading.value = false;

  if (result.success) {
    router.push(route.query.redirect || "/account");
  } else {
    error.value = result.error || "Erreur de connexion";
  }
}
</script>

<template>
  <div class="container-page py-12 max-w-md">
    <div class="card p-8">
      <h1 class="text-2xl font-bold text-slate-800 mb-2">Connexion</h1>
      <p class="text-sm text-slate-500 mb-6">
        Accedez a vos favoris et alertes.
      </p>

      <form class="space-y-4" @submit.prevent="submit">
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
          placeholder="••••••••"
        />

        <div v-if="error" class="text-sm text-red-600 bg-red-50 p-2 rounded">
          {{ error }}
        </div>

        <BaseButton
          type="submit"
          size="lg"
          class="w-full"
          :disabled="loading"
        >
          {{ loading ? "Connexion…" : "Se connecter" }}
        </BaseButton>
      </form>

      <div class="mt-6 text-center text-sm text-slate-500 space-y-2">
        <div>
          <RouterLink to="/reset-password" class="text-brand-600 hover:underline">
            Mot de passe oublie ?
          </RouterLink>
        </div>
        <div>
          Pas de compte ?
          <RouterLink to="/signup" class="text-brand-600 hover:underline font-medium">
            S'inscrire
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
