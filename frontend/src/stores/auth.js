import { defineStore } from "pinia";
import { supabase } from "@/services/supabase";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    session: null,
    role: "user",
    loading: false,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (s) => !!s.session,
    isAdmin: (s) => s.role === "admin",
    userEmail: (s) => s.user?.email || "",
    userId: (s) => s.user?.id || null,
  },

  actions: {
    async init() {
      if (this.initialized) return;

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        this.session = session;
        this.user = session.user;
        await this.loadRole();
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        this.session = session;
        this.user = session?.user || null;

        if (session) {
          await this.loadRole();
        } else {
          this.role = "user";
        }
      });

      this.initialized = true;
    },

    async loadRole() {
  if (!this.user) return;

  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", this.user.id);

    if (!data || data.length === 0) {
      this.role = "user";
      return;
    }

    // Récupère tous les rôles
    const roles = data.map((r) => r.role);

    // Priorité : admin > user
    if (roles.includes("admin")) {
      this.role = "admin";
    } else {
      this.role = roles[0] || "user";
    }
  } catch (e) {
    console.error("Erreur loadRole:", e);
    this.role = "user";
  }
},

    async signup(email, password, nom = "") {
      this.loading = true;
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nom },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e.message };
      } finally {
        this.loading = false;
      }
    },

    async login(email, password) {
      this.loading = true;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        this.session = data.session;
        this.user = data.user;
        await this.loadRole();

        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      await supabase.auth.signOut();
      this.user = null;
      this.session = null;
      this.role = "user";
    },

    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { success: !error, error: error?.message };
    },

    async updatePassword(newPassword) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { success: !error, error: error?.message };
    },

    getAccessToken() {
      return this.session?.access_token || null;
    },
  },
});
