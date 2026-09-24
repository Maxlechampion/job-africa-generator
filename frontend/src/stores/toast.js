import { defineStore } from "pinia";

export const useToastStore = defineStore("toast", {
  state: () => ({
    toasts: [],
    nextId: 1,
  }),

  actions: {
    add({ type = "info", title, message, duration = 5000, actions = [], data = null }) {
      const id = this.nextId++;
      this.toasts.push({ id, type, title, message, actions, data, createdAt: Date.now() });
      if (duration > 0) {
        setTimeout(() => this.remove(id), duration);
      }
      return id;
    },

    remove(id) {
      const index = this.toasts.findIndex((t) => t.id === id);
      if (index !== -1) this.toasts.splice(index, 1);
    },

    success(title, message, options = {}) {
      return this.add({ type: "success", title, message, ...options });
    },

    error(title, message, options = {}) {
      return this.add({ type: "error", title, message, ...options });
    },

    info(title, message, options = {}) {
      return this.add({ type: "info", title, message, ...options });
    },

    warning(title, message, options = {}) {
      return this.add({ type: "warning", title, message, ...options });
    },

    payment(reference, montant, devise = "FCFA") {
      return this.add({
        type: "payment",
        title: "Transaction créée",
        message: "Votre offre sera boostée dès confirmation du paiement.",
        duration: 10000,
        data: { reference, montant, devise },
        actions: [
          {
            label: "Copier la référence",
            primary: false,
            handler: () => {
              navigator.clipboard.writeText(reference);
            },
          },
          {
            label: "Compris",
            primary: true,
            dismiss: true,
          },
        ],
      });
    },
  },
});
