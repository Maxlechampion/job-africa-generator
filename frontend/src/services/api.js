import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL,
  timeout: 60000,   // ⚠️ Augmente à 60s pour la collecte
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    console.error("[API]", error?.response?.status, error?.message);
    return Promise.reject(error);
  }
);

export default {
  // ==================== Jobs ====================
  getJobs(params = {}) {
    return api.get("/jobs", { params }).then((r) => r.data);
  },
  getJob(id) {
    return api.get(`/jobs/${id}`).then((r) => r.data);
  },

  // ==================== Stats ====================
  getCountries() {
    return api.get("/countries").then((r) => r.data);
  },
  getCategories() {
    return api.get("/categories").then((r) => r.data);
  },
  getSources() {
    return api.get("/sources").then((r) => r.data);
  },
  getStats() {
    return api.get("/stats").then((r) => r.data);
  },

  // ==================== Companies / Skills ====================
  getCompanies() {
    return api.get("/companies").then((r) => r.data);
  },
  getSkills() {
    return api.get("/skills").then((r) => r.data);
  },

  // ==================== Collecte (⚠️ À AJOUTER) ====================
  triggerCollect() {
    return api.post("/admin/scheduler/trigger").then((r) => r.data);
  },
  collectAts() {
    return api.post("/collect/ats/run").then((r) => r.data);
  },
  collectApi() {
    return api.post("/collect/api/run").then((r) => r.data);
  },
  collectScrapers() {
    return api.post("/collect/scrapers/run").then((r) => r.data);
  },

  // ==================== Scheduler ====================
  getSchedulerStatus() {
    return api.get("/admin/scheduler/status").then((r) => r.data);
  },
  getLogs(limit = 20) {
    return api.get("/admin/logs", { params: { limit } }).then((r) => r.data);
  },
};