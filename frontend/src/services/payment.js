import axios from "axios";
import { supabase } from "./supabase";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 30000 });

// ==================== INTERCEPTEUR AUTH ====================
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    console.warn("[PAYMENT] Erreur session :", e);
  }

  return config;
});

// ==================== GESTION ERREURS ====================
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[PAYMENT] 401 — Non authentifié");
    }
    return Promise.reject(error);
  }
);

// ==================== API ====================
export default {
  getTarifs: () =>
    api.get("/payments/tarifs").then((r) => r.data),

  initiate: (type, metadata = {}) =>
    api
      .post("/payments/initiate", { type, metadata })
      .then((r) => {
        console.log("[PAYMENT] Réponse initiate :", r.data);
        return r.data;
      }),

  getTransactions: () =>
    api.get("/payments/transactions").then((r) => r.data),

  getPremiumStatus: () =>
    api.get("/premium/status").then((r) => r.data),

  boostJob: (jobId) =>
    api.post(`/premium/jobs/${jobId}/boost`).then((r) => r.data),

  getBanners: (placement) =>
    api.get(`/sponsored/banners/${placement}`).then((r) => r.data),
};
