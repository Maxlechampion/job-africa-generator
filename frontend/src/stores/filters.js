import { defineStore } from "pinia";
import api from "@/services/api";

export const useFiltersStore = defineStore("filters", {
  state: () => ({
    countries: [],
    categories: [],
    sources: [],
    loaded: false,
  }),

  actions: {
    async loadReferentials() {
      if (this.loaded) return;
      try {
        const [countries, categories, sources] = await Promise.all([
          api.getCountries(),
          api.getCategories(),
          api.getSources(),
        ]);
        this.countries = countries || [];
        this.categories = categories || [];
        this.sources = sources || [];
        this.loaded = true;
      } catch (e) {
        console.error("Referentiels non charges", e);
      }
    },
  },
});
