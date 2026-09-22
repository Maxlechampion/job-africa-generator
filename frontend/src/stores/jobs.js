import { defineStore } from "pinia";
import api from "@/services/api";

export const useJobsStore = defineStore("jobs", {
  state: () => ({
    jobs: [],
    total: 0,
    loading: false,
    error: null,
    currentJob: null,
  }),

  actions: {
    async fetchJobs(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const data = await api.getJobs(params);
        this.jobs = data.results || [];
        this.total = data.total || 0;
      } catch (e) {
        this.error = "Impossible de charger les offres.";
        this.jobs = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },

    async fetchJob(id) {
      this.loading = true;
      this.error = null;
      this.currentJob = null;
      try {
        this.currentJob = await api.getJob(id);
      } catch (e) {
        this.error = "Offre introuvable.";
      } finally {
        this.loading = false;
      }
    },
  },
});
