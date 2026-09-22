<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import BaseButton from "@/components/ui/BaseButton.vue";

const auth = useAuthStore();
const router = useRouter();
const message = ref("");

async function logout() {
  await auth.logout();
  router.push("/");
}

async function changePassword() {
  const newPass = prompt("Nouveau mot de passe (8 caracteres minimum) :");
  if (!newPass || newPass.length < 8) return;

  const result = await auth.updatePassword(newPass);
  message.value = result.success
    ? "✅ Mot de passe mis a jour"
    : "❌ " + result.error;
}
</script>

<template>
  <div class="container-page py-8 max-w-2xl">
    <h1 class="text-2xl font-bold text-slate-800 mb-6">Mon compte</h1>

    <div class="card p-6 space-y-4">
      <div>
        <div class="text-xs text-slate-500 uppercase">Email</div>
        <div class="font-medium text-slate-800">{{ auth.userEmail }}</div>
      </div>

      <div>
        <div class="text-xs text-slate-500 uppercase">Role</div>
        <div class="font-medium text-slate-800">
          {{ auth.isAdmin ? "👑 Admin" : "👤 Utilisateur" }}
        </div>
      </div>

      <div class="pt-4 border-t border-slate-100 flex gap-3 flex-wrap">
        <BaseButton variant="outline" @click="changePassword">
          Changer le mot de passe
        </BaseButton>
        <BaseButton variant="secondary" @click="logout">
          Se deconnecter
        </BaseButton>
      </div>

      <div v-if="message" class="text-sm text-slate-600 mt-2">
        {{ message }}
      </div>
    </div>

    <div class="mt-6 grid sm:grid-cols-3 gap-3">
      <RouterLink
        to="/favorites"
        class="card p-4 text-center hover:shadow-md transition"
      >
        <div class="text-2xl mb-1">⭐</div>
        <div class="text-sm font-medium text-slate-700">Mes favoris</div>
      </RouterLink>

      <RouterLink
        to="/alerts"
        class="card p-4 text-center hover:shadow-md transition"
      >
        <div class="text-2xl mb-1">🔔</div>
        <div class="text-sm font-medium text-slate-700">Mes alertes</div>
      </RouterLink>

      <RouterLink
        v-if="auth.isAdmin"
        to="/admin"
        class="card p-4 text-center hover:shadow-md transition"
      >
        <div class="text-2xl mb-1">📊</div>
        <div class="text-sm font-medium text-slate-700">Admin</div>
      </RouterLink>
    </div>
  </div>
</template>
