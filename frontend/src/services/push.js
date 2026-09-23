/**
 * Service de gestion des notifications push.
 */

import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}


export default {
  async getVapidKey() {
    const { data } = await api.get("/push/vapid-public-key");
    return data.publicKey;
  },

  async subscribe(subscription) {
    return api.post("/push/subscribe", subscription.toJSON()).then((r) => r.data);
  },

  async unsubscribe(endpoint) {
    return api.post("/push/unsubscribe", { endpoint }).then((r) => r.data);
  },

  async test() {
    return api.post("/push/test").then((r) => r.data);
  },

  isSupported() {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  async requestAndSubscribe() {
    if (!this.isSupported()) {
      throw new Error("Push non supporte par ce navigateur");
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Permission refusee");
    }

    const vapidKey = await this.getVapidKey();

    const registration = await navigator.serviceWorker.register("/sw-push.js", {
      scope: "/",
    });

    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    await this.subscribe(subscription);

    return subscription;
  },

  async getSubscription() {
    if (!this.isSupported()) return null;

    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  },

  getPermission() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  },
};
