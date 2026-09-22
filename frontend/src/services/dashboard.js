import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 30000 });

export default {
  getDashboard: () => api.get("/admin/dashboard").then((r) => r.data),
  getKPI: () => api.get("/admin/dashboard/kpi").then((r) => r.data),
  getDaily: (days = 30) =>
    api.get("/admin/dashboard/daily", { params: { days } }).then((r) => r.data),
  getTopSkills: (limit = 15) =>
    api.get("/admin/dashboard/top-skills", { params: { limit } }).then((r) => r.data),
  getTopPays: (limit = 10) =>
    api.get("/admin/dashboard/top-pays", { params: { limit } }).then((r) => r.data),
  getSources: () => api.get("/admin/dashboard/sources").then((r) => r.data),
  getLogs: (limit = 20) =>
    api.get("/admin/dashboard/logs", { params: { limit } }).then((r) => r.data),
};
