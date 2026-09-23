/**
 * Service de partage social.
 */

import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 15000 });

export default {
  getUrls(jobId) {
    return api.get(`/share/jobs/${jobId}/urls`).then((r) => r.data);
  },

  getStats(jobId) {
    return api.get(`/share/jobs/${jobId}/stats`).then((r) => r.data);
  },

  track(jobId, canal, referrer = null) {
    return api
      .post("/share/track", { job_id: jobId, canal, referrer })
      .then((r) => r.data)
      .catch(() => ({ success: false }));
  },
};

export const SHARE_CHANNELS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    color: "hover:bg-green-50 hover:text-green-700",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "💼",
    color: "hover:bg-blue-50 hover:text-blue-700",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: "📘",
    color: "hover:bg-blue-50 hover:text-blue-800",
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    icon: "𝕏",
    color: "hover:bg-slate-100 hover:text-slate-900",
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: "✈️",
    color: "hover:bg-sky-50 hover:text-sky-700",
  },
  {
    key: "email",
    label: "Email",
    icon: "📧",
    color: "hover:bg-amber-50 hover:text-amber-700",
  },
];

export function supportsWebShare() {
  return typeof navigator !== "undefined" && !!navigator.share;
}

export async function nativeShare(title, text, url) {
  if (!supportsWebShare()) return false;

  try {
    await navigator.share({ title, text, url });
    return true;
  } catch (e) {
    return false;
  }
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch (e) {
    return false;
  }
}
