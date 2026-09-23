#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 13 — PARTAGE SOCIAL (WhatsApp, LinkedIn, QR Code)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute le partage social des offres d'emploi :
 *   - Backend : service + API + tracking
 *   - Frontend : bouton, modale, QR Code
 *   - 6 canaux : WhatsApp, LinkedIn, Facebook, Twitter, Telegram, Email
 *
 * USAGE :
 *   node 13-social-share.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle (écrase)
 *   --dry-run        Simule sans écrire
 *   --uninstall      Désinstalle
 *   --verbose        Affiche les détails
 *
 * PRÉREQUIS :
 *   - Modules 00, 01, 07, 09 installés
 *   - Table `shares` créée dans Supabase
 *
 * DÉPENDANCES FRONTEND :
 *   - qrcode (npm install qrcode)
 *
 * ═══════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";

import { exists, writeFiles, removeFile, ROOT } from "./_lib/fs-utils.js";
import { log } from "./_lib/logger.js";
import { markInstalled, markUninstalled, isInstalled } from "./_lib/registry.js";
import { validateRequirements } from "./_lib/validator.js";

const args = process.argv.slice(2);
const OPTIONS = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  uninstall: args.includes("--uninstall"),
  verbose: args.includes("--verbose"),
};

const MODULE_ID = "13";
const MODULE_NAME = "Partage social";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/services/job_service.py",
  "frontend/src/views/JobDetailView.vue",
];

// ==================== Backend : schemas/share.py ====================

const SCHEMAS_SHARE = `"""
Schemas Pydantic pour le partage social.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ShareCreate(BaseModel):
    job_id: int
    canal: str  # whatsapp, linkedin, facebook, twitter, telegram, email, copy, native, other
    referrer: Optional[str] = None


class ShareStats(BaseModel):
    job_id: int
    total_partages: int
    whatsapp: int
    linkedin: int
    facebook: int
    copies: int
    dernier_partage: Optional[datetime] = None


class ShareResponse(BaseModel):
    success: bool
    message: str


class JobOGData(BaseModel):
    title: str
    description: str
    url: str
    image: Optional[str] = None
    site_name: str = "Job Africa"
    locale: str = "fr_FR"
`;

// ==================== Backend : services/share_service.py ====================

const SHARE_SERVICE = `"""
Service de partage : tracking + generation Open Graph.
"""

import hashlib
import urllib.parse

from app.core.supabase import supabase
from app.core.logger import get_logger


logger = get_logger(__name__)

TABLE = "shares"

CANAUX_VALIDES = {
    "whatsapp", "linkedin", "facebook", "twitter",
    "telegram", "email", "copy", "native", "other",
}

FRONTEND_URL = "https://frontend-zeta-six-12mzm0ovel.vercel.app"


def _hash_ip(ip: str | None) -> str | None:
    """Hash RGPD-compatible de l'IP."""
    if not ip:
        return None
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def record_share(
    job_id: int,
    canal: str,
    user_id: str | None = None,
    user_agent: str | None = None,
    referrer: str | None = None,
    ip: str | None = None,
) -> dict:
    """Enregistre un partage."""

    if canal not in CANAUX_VALIDES:
        canal = "other"

    payload = {
        "job_id": job_id,
        "canal": canal,
        "user_id": user_id,
        "user_agent": (user_agent or "")[:500],
        "referrer": (referrer or "")[:500],
        "ip_hash": _hash_ip(ip),
    }

    try:
        r = supabase.table(TABLE).insert(payload).execute()
        return r.data[0] if r.data else {}
    except Exception as e:
        logger.error(f"Erreur tracking partage : {e}")
        return {}


def get_job_share_stats(job_id: int) -> dict:
    """Retourne les statistiques de partage d'une offre."""

    try:
        r = (
            supabase.table(TABLE)
            .select("canal")
            .eq("job_id", job_id)
            .execute()
        )

        rows = r.data or []

        counts = {c: 0 for c in CANAUX_VALIDES}
        for row in rows:
            c = row.get("canal", "other")
            counts[c] = counts.get(c, 0) + 1

        return {
            "job_id": job_id,
            "total_partages": len(rows),
            "whatsapp": counts.get("whatsapp", 0),
            "linkedin": counts.get("linkedin", 0),
            "facebook": counts.get("facebook", 0),
            "copies": counts.get("copy", 0),
        }
    except Exception as e:
        logger.error(f"Erreur stats partage : {e}")
        return {
            "job_id": job_id,
            "total_partages": 0,
            "whatsapp": 0,
            "linkedin": 0,
            "facebook": 0,
            "copies": 0,
        }


def build_share_urls(job: dict) -> dict:
    """Construit les URLs de partage pour chaque canal."""

    job_id = job.get("id")
    titre = job.get("titre", "Offre d'emploi")
    entreprise = job.get("entreprise", "")
    pays = job.get("pays", "")
    ville = job.get("ville", "")

    url = f"{FRONTEND_URL}/jobs/{job_id}"

    localisation = " · ".join(filter(None, [ville, pays]))

    message = (
        f"🌍 *{titre}*\\n"
        f"{entreprise}\\n"
        f"📍 {localisation}\\n\\n"
        f"👉 Voir l'offre sur Job Africa :\\n{url}"
    )

    message_linkedin = f"{titre} — {entreprise} · {localisation}"

    url_enc = urllib.parse.quote(url)
    message_enc = urllib.parse.quote(message)
    message_li_enc = urllib.parse.quote(message_linkedin)

    return {
        "url": url,
        "message": message,
        "message_linkedin": message_linkedin,
        "whatsapp": f"https://wa.me/?text={message_enc}",
        "linkedin": f"https://www.linkedin.com/sharing/share-offsite/?url={url_enc}",
        "facebook": f"https://www.facebook.com/sharer/sharer.php?u={url_enc}",
        "twitter": f"https://twitter.com/intent/tweet?text={message_li_enc}&url={url_enc}",
        "telegram": f"https://t.me/share/url?url={url_enc}&text={message_li_enc}",
        "email": f"mailto:?subject={urllib.parse.quote(titre)}&body={message_enc}",
    }


def build_og_data(job: dict, lang: str = "fr") -> dict:
    """Construit les donnees Open Graph pour une offre."""

    titre = job.get("titre", "Offre d'emploi")
    entreprise = job.get("entreprise", "")
    pays = job.get("pays", "")
    ville = job.get("ville", "")
    description = job.get("description") or ""
    resume = job.get("resume_ia") or description

    if len(resume) > 160:
        resume = resume[:157] + "..."

    localisation = " · ".join(filter(None, [ville, pays]))

    og_title = f"{titre} — {entreprise}" if entreprise else titre
    og_description = f"📍 {localisation}\\n\\n{resume}" if localisation else resume

    return {
        "title": og_title,
        "description": og_description,
        "url": f"{FRONTEND_URL}/jobs/{job.get('id')}",
        "image": f"{FRONTEND_URL}/og/job/{job.get('id')}.png",
        "site_name": "Job Africa",
        "locale": "fr_FR" if lang == "fr" else "en_US",
    }
`;

// ==================== Backend : api/share.py ====================

const SHARE_API = `"""
Routes API pour le partage social.
"""

from fastapi import APIRouter, Header, HTTPException, Request

from app.schemas.share import (
    JobOGData,
    ShareCreate,
    ShareResponse,
    ShareStats,
)
from app.services.share_service import (
    build_og_data,
    build_share_urls,
    get_job_share_stats,
    record_share,
)
from app.services.job_service import get_job


router = APIRouter(prefix="/share", tags=["share"])


@router.post("/track", response_model=ShareResponse)
def track_share(
    payload: ShareCreate,
    request: Request,
    user_agent: str | None = Header(None),
    referer: str | None = Header(None),
):
    """Enregistre un partage."""

    job = get_job(payload.job_id)
    if not job:
        raise HTTPException(404, "Offre introuvable")

    client_ip = request.client.host if request.client else None

    record_share(
        job_id=payload.job_id,
        canal=payload.canal,
        user_agent=user_agent,
        referrer=payload.referrer or referer,
        ip=client_ip,
    )

    return ShareResponse(success=True, message="Partage enregistre")


@router.get("/jobs/{job_id}/urls")
def get_share_urls(job_id: int):
    """Retourne les URLs de partage pour chaque canal."""

    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Offre introuvable")

    return build_share_urls(job)


@router.get("/jobs/{job_id}/stats", response_model=ShareStats)
def get_stats(job_id: int):
    """Retourne les statistiques de partage d'une offre."""
    return get_job_share_stats(job_id)


@router.get("/jobs/{job_id}/og", response_model=JobOGData)
def get_og(job_id: int, lang: str = "fr"):
    """Retourne les donnees Open Graph pour une offre."""

    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Offre introuvable")

    return build_og_data(job, lang)
`;

// ==================== Frontend : services/share.js ====================

const SHARE_SERVICE_JS = `/**
 * Service de partage social.
 */

import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 15000 });

export default {
  getUrls(jobId) {
    return api.get(\`/share/jobs/\${jobId}/urls\`).then((r) => r.data);
  },

  getStats(jobId) {
    return api.get(\`/share/jobs/\${jobId}/stats\`).then((r) => r.data);
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
`;

// ==================== Frontend : ShareButton.vue ====================

const SHARE_BUTTON = `<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import ShareModal from "./ShareModal.vue";
import {
  supportsWebShare,
  nativeShare,
  copyToClipboard,
} from "@/services/share";
import shareApi from "@/services/share";

const props = defineProps({
  job: { type: Object, required: true },
  variant: { type: String, default: "button" },
});

const { t } = useI18n();

const showModal = ref(false);
const copied = ref(false);

async function handleShare() {
  const url = \`\${window.location.origin}/jobs/\${props.job.id}\`;

  if (supportsWebShare()) {
    const shared = await nativeShare(
      props.job.titre,
      \`\${props.job.titre} — \${props.job.entreprise || "Job Africa"}\`,
      url
    );

    if (shared) {
      shareApi.track(props.job.id, "native");
      return;
    }
  }

  showModal.value = true;
}

async function quickCopy() {
  const url = \`\${window.location.origin}/jobs/\${props.job.id}\`;
  const ok = await copyToClipboard(url);

  if (ok) {
    copied.value = true;
    shareApi.track(props.job.id, "copy");
    setTimeout(() => (copied.value = false), 2000);
  }
}

function closeModal() {
  showModal.value = false;
}
</script>

<template>
  <div class="relative inline-flex">
    <button
      v-if="variant === 'icon'"
      class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
      :title="t('common.share', 'Partager')"
      @click="handleShare"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    </button>

    <button
      v-else
      class="btn border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 text-sm inline-flex items-center gap-2"
      @click="handleShare"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      <span>{{ copied ? "✓ Copié !" : t("common.share", "Partager") }}</span>
    </button>

    <ShareModal v-if="showModal" :job="job" @close="closeModal" />
  </div>
</template>
`;

// ==================== Frontend : ShareModal.vue ====================

const SHARE_MODAL = `<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import ShareQRCode from "./ShareQRCode.vue";
import { SHARE_CHANNELS, copyToClipboard } from "@/services/share";
import shareApi from "@/services/share";

const props = defineProps({
  job: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const { t } = useI18n();

const urls = ref(null);
const copied = ref(false);
const loading = ref(true);
const showQR = ref(false);

async function loadUrls() {
  try {
    urls.value = await shareApi.getUrls(props.job.id);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function shareVia(canal) {
  if (!urls.value) return;
  const url = urls.value[canal];
  if (!url) return;

  window.open(url, "_blank", "noopener,noreferrer,width=600,height=700");
  shareApi.track(props.job.id, canal);
  setTimeout(() => emit("close"), 300);
}

async function copyLink() {
  if (!urls.value) return;
  const ok = await copyToClipboard(urls.value.url);
  if (ok) {
    copied.value = true;
    shareApi.track(props.job.id, "copy");
    setTimeout(() => (copied.value = false), 2000);
  }
}

function handleKeydown(e) {
  if (e.key === "Escape") emit("close");
}

onMounted(() => {
  loadUrls();
  document.addEventListener("keydown", handleKeydown);
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between p-5 border-b border-slate-100">
        <div>
          <h2 class="font-semibold text-slate-800">Partager cette offre</h2>
          <p class="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{{ job.titre }}</p>
        </div>
        <button
          class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          @click="emit('close')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div v-if="loading" class="p-8 text-center">
        <div class="w-8 h-8 mx-auto border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <div class="p-5">
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="c in SHARE_CHANNELS"
              :key="c.key"
              :class="['flex flex-col items-center gap-2 p-4 rounded-xl transition border border-slate-100', c.color]"
              @click="shareVia(c.key)"
            >
              <span class="text-2xl">{{ c.icon }}</span>
              <span class="text-xs font-medium text-slate-700">{{ c.label }}</span>
            </button>
          </div>

          <div class="mt-4">
            <div class="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="text"
                :value="urls?.url"
                readonly
                class="flex-1 bg-transparent text-xs text-slate-600 outline-none truncate"
              />
              <button
                class="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition whitespace-nowrap"
                @click="copyLink"
              >
                {{ copied ? "✓ Copié" : "Copier" }}
              </button>
            </div>
          </div>

          <button
            class="w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 hover:text-brand-600 transition"
            @click="showQR = !showQR"
          >
            <span>📱</span>
            <span>{{ showQR ? "Masquer le QR Code" : "Afficher le QR Code" }}</span>
          </button>

          <div v-if="showQR" class="mt-4 flex justify-center">
            <ShareQRCode :url="urls?.url" :title="job.titre" />
          </div>
        </div>

        <div class="px-5 pb-5 text-center">
          <p class="text-xs text-slate-400">
            Partagez cette offre avec votre réseau pour aider d'autres candidats.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
`;

// ==================== Frontend : ShareQRCode.vue ====================

const SHARE_QRCODE = `<script setup>
import { ref, onMounted, watch } from "vue";
import QRCode from "qrcode";

const props = defineProps({
  url: { type: String, required: true },
  title: { type: String, default: "" },
});

const canvasRef = ref(null);

async function generate() {
  if (!canvasRef.value || !props.url) return;

  try {
    await QRCode.toCanvas(canvasRef.value, props.url, {
      width: 220,
      margin: 1,
      color: { dark: "#1e293b", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch (e) {
    console.error("Erreur QR Code :", e);
  }
}

function download() {
  if (!canvasRef.value) return;
  const link = document.createElement("a");
  link.download = \`job-africa-\${props.title || "offre"}.png\`;
  link.href = canvasRef.value.toDataURL("image/png");
  link.click();
}

onMounted(generate);
watch(() => props.url, generate);
</script>

<template>
  <div class="text-center">
    <div class="bg-white p-3 rounded-xl border border-slate-200 inline-block">
      <canvas ref="canvasRef"></canvas>
    </div>
    <div class="mt-3">
      <button class="text-xs text-slate-500 hover:text-brand-600 transition" @click="download">
        ⬇️ Télécharger le QR Code
      </button>
    </div>
    <p class="text-xs text-slate-400 mt-2 max-w-[220px] mx-auto">
      Scannez avec votre téléphone pour ouvrir l'offre
    </p>
  </div>
</template>
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/schemas/share.py": SCHEMAS_SHARE,
  "backend/app/services/share_service.py": SHARE_SERVICE,
  "backend/app/api/share.py": SHARE_API,
  "frontend/src/services/share.js": SHARE_SERVICE_JS,
  "frontend/src/components/jobs/ShareButton.vue": SHARE_BUTTON,
  "frontend/src/components/jobs/ShareModal.vue": SHARE_MODAL,
  "frontend/src/components/jobs/ShareQRCode.vue": SHARE_QRCODE,
};

// ==================== Patch de main.py ====================

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${mainPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("share")) {
    log.info("main.py deja patche (share present)");
    return true;
  }

  // Backup
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "main.py"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  // Patch import
  content = content.replace(
    /from app\.api import \(([\s\S]*?)\)/,
    (match, inner) => {
      if (inner.includes("share")) return match;
      return `from app.api import (${inner.trimEnd()},\n    share,\n)`;
    }
  );

  // Patch include_router
  if (!content.includes("app.include_router(share.router)")) {
    content = content.replace(
      /app\.include_router\(auth\.router\)/,
      "app.include_router(auth.router)\napp.include_router(share.router)"
    );
  }

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(mainPath + " (patché)", "overwritten");
  return true;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 13 — PARTAGE SOCIAL");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller, ou --uninstall pour supprimer.");
    process.exit(0);
  }

  // Désinstallation
  if (OPTIONS.uninstall) {
    for (const file of Object.keys(FILES)) {
      if (exists(file)) {
        if (!OPTIONS.dryRun) removeFile(file);
        log.file(file, "removed");
      }
    }
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    log.success("Module desinstalle.");
    return;
  }

  // Création des fichiers
  log.section(`Creation de ${Object.keys(FILES).length} fichiers`);

  const results = writeFiles(FILES, {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    `-> ${results.created} cree(s), ${results.overwritten} ecrase(s), ${results.skipped} ignore(s)`
  );

  // Patch main.py
  log.section("Patch de main.py");
  patchMainPy();

  // Enregistrement
  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 13 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  DEPENDANCE FRONTEND A INSTALLER :");
  console.log("    cd frontend");
  console.log("    npm install qrcode");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Installer qrcode dans le frontend");
  console.log("  2. Uvicorn redemarre automatiquement");
  console.log("  3. Tester : GET /share/jobs/1/urls");
  console.log("  4. Tester : GET /share/jobs/1/stats");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});