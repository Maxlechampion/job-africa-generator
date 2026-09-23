import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { i18n, setLocale } from "@/i18n";

const routes = [
  {
    path: "/:lang(fr|en)?",
    children: [
      {
        path: "",
        name: "home",
        component: () => import("@/views/HomeView.vue"),
        meta: { title: "Accueil" },
      },
      {
        path: "jobs",
        name: "jobs",
        component: () => import("@/views/JobsView.vue"),
        meta: { title: "Offres d'emploi" },
      },
      {
        path: "jobs/:id",
        name: "job-detail",
        component: () => import("@/views/JobDetailView.vue"),
        meta: { title: "Détail" },
      },
      {
        path: "stats",
        name: "stats",
        component: () => import("@/views/StatsView.vue"),
        meta: { title: "Statistiques" },
      },
      {
        path: "pricing",
        name: "pricing",
        component: () => import("@/views/PricingView.vue"),
        meta: { title: "Tarifs" },
      },
      {
        path: "login",
        name: "login",
        component: () => import("@/views/LoginView.vue"),
        meta: { guestOnly: true },
      },
      {
        path: "signup",
        name: "signup",
        component: () => import("@/views/SignupView.vue"),
        meta: { guestOnly: true },
      },
      {
        path: "reset-password",
        name: "reset-password",
        component: () => import("@/views/ResetPasswordView.vue"),
        meta: { guestOnly: true },
      },
      {
        path: "account",
        name: "account",
        component: () => import("@/views/AccountView.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "admin",
        name: "admin",
        component: () => import("@/views/AdminView.vue"),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/views/NotFoundView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to, _from, next) => {
  const lang = to.params.lang;

  if (lang === "en" && i18n.global.locale.value !== "en") {
    setLocale("en");
  } else if ((!lang || lang === "fr") && i18n.global.locale.value !== "fr") {
    setLocale("fr");
  }

  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.init();
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: "login", query: { redirect: to.fullPath } });
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next({ name: "home" });
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return next({ name: "account" });
  }

  next();
});

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} • Job Africa`
    : "Job Africa";
});

export default router;
