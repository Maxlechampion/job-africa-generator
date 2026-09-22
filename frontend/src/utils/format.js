export function timeAgo(dateString) {
  if (!dateString) return "Date inconnue";

  const date = new Date(dateString);
  if (isNaN(date)) return "Date inconnue";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "a l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;

  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;

  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;

  return `il y a ${Math.floor(months / 12)} an(s)`;
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function truncate(text, length = 180) {
  if (!text) return "";
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > length ? clean.slice(0, length) + "…" : clean;
}

export function countryFlag(country) {
  const map = {
    Bénin: "🇧🇯", Benin: "🇧🇯",
    Togo: "🇹🇬",
    "Côte d'Ivoire": "🇨🇮",
    Sénégal: "🇸🇳", Senegal: "🇸🇳",
    "Burkina Faso": "🇧🇫",
    Mali: "🇲🇱",
    Niger: "🇳🇪",
    Guinée: "🇬🇳", Guinea: "🇬🇳",
    Ghana: "🇬🇭",
    Nigeria: "🇳🇬",
    Kenya: "🇰🇪",
    Uganda: "🇺🇬",
    "Afrique du Sud": "🇿🇦",
    Egypte: "🇪🇬",
  };
  return map[country] || "🌍";
}
