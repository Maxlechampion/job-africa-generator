/**
 * Service de paiement.
 */

import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default {
  getTarifs: () => api.get("/payments/tarifs").then((r) => r.data),
  initiate: (type, metadata = {}) =>
    api.post("/payments/initiate", { type, metadata }).then((r) => r.data),
  getTransactions: () => api.get("/payments/transactions").then((r) => r.data),
  getPremiumStatus: () => api.get("/premium/status").then((r) => r.data),
  boostJob: (jobId) => api.post(`/premium/jobs/${jobId}/boost`).then((r) => r.data),
  getBanners: (placement) =>
    api.get(`/sponsored/banners/${placement}`).then((r) => r.data),
};
