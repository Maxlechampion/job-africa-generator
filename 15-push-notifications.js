#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 15 — NOTIFICATIONS PUSH (Web Push API)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute les notifications push temps réel :
 *   - Backend : VAPID + service + API + intégration alertes
 *   - Frontend : Service Worker + PushPrompt + API
 *
 * USAGE :
 *   node 15-push-notifications.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle
 *   --dry-run        Simule sans écrire
 *   --uninstall      Désinstalle
 *
 * PRÉREQUIS :
 *   - Modules 00, 01, 11, 07 installés
 *   - Table `push_subscriptions` créée dans Supabase
 *   - Clés VAPID générées
 *
 * DÉPENDANCE BACKEND :
 *   - pywebpush (à installer : pip install pywebpush)
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

const MODULE_ID = "15";
const MODULE_NAME = "Notifications push";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/services/alert_service.py",
  "frontend/src/App.vue",
];

// ==================== Backend : core/push.py ====================

const PUSH_CONFIG = `"""
Configuration Web Push / VAPID.
"""

import os


# ==================== VAPID ====================
VAPID_PUBLIC_KEY = os.getenv(
    "VAPID_PUBLIC_KEY",
    "BLojGYLkULaAWVzxeB9Uh9BLNyZ6Kr1yBGW0UTxelDxOJE2jM3LM6dy1k3oiXBlFmFOR8AFnBKkf2v7W1k47E4s",
)

VAPID_PRIVATE_KEY = os.getenv(
    "VAPID_PRIVATE_KEY",
    "b2OIdC7OGZK-MaXCcgk06ja-5zghlAGxUpObHOwLDiw",
)

VAPID_SUBJECT = os.getenv(
    "VAPID_SUBJECT",
    "mailto:contact@jobafrica.app",
)


# ==================== Configuration ====================
DEFAULT_TTL = 4 * 60 * 60  # 4 heures
DEFAULT_URGENCY = "normal"  # very-low | low | normal | high
`;

// ==================== Backend : services/push_service.py ====================

const PUSH_SERVICE = `"""
Service d'envoi de notifications push.

Base sur pywebpush.
"""

from datetime import datetime, timezone

from pywebpush import webpush, WebPushException

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.core.push import (
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
    VAPID_SUBJECT,
    DEFAULT_TTL,
    DEFAULT_URGENCY,
)


logger = get_logger(__name__)

TABLE = "push_subscriptions"


# ==================== Enregistrement ====================
def save_subscription(
    user_id: str,
    subscription: dict,
    user_agent: str | None = None,
) -> dict | None:
    """Enregistre ou met a jour une souscription push."""

    endpoint = subscription.get("endpoint")
    keys = subscription.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")

    if not endpoint or not p256dh or not auth:
        logger.warning("Souscription invalide : endpoint ou cles manquants")
        return None

    payload = {
        "user_id": user_id,
        "endpoint": endpoint,
        "p256dh": p256dh,
        "auth": auth,
        "user_agent": (user_agent or "")[:500],
    }

    try:
        r = (
            supabase.table(TABLE)
            .upsert(payload, on_conflict="endpoint")
            .execute()
        )
        logger.info(f"Souscription push enregistree pour {user_id}")
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur enregistrement souscription : {e}")
        return None


def delete_subscription(endpoint: str):
    """Supprime une souscription."""

    try:
        supabase.table(TABLE).delete().eq("endpoint", endpoint).execute()
        logger.info(f"Souscription supprimee : {endpoint[:40]}...")
    except Exception as e:
        logger.error(f"Erreur suppression souscription : {e}")


def get_user_subscriptions(user_id: str) -> list[dict]:
    """Retourne toutes les souscriptions d'un utilisateur."""

    try:
        r = (
            supabase.table(TABLE)
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return r.data or []
    except Exception as e:
        logger.error(f"Erreur lecture souscriptions : {e}")
        return []


# ==================== Envoi ====================
def _build_subscription_info(sub: dict) -> dict:
    """Construit l'objet subscription_info pour pywebpush."""

    return {
        "endpoint": sub["endpoint"],
        "keys": {
            "p256dh": sub["p256dh"],
            "auth": sub["auth"],
        },
    }


def send_push_to_subscription(
    sub: dict,
    payload: dict,
    ttl: int = DEFAULT_TTL,
    urgency: str = DEFAULT_URGENCY,
) -> bool:
    """Envoie une notification a une souscription."""

    if not VAPID_PRIVATE_KEY:
        logger.error("VAPID_PRIVATE_KEY manquante")
        return False

    try:
        webpush(
            subscription_info=_build_subscription_info(sub),
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=ttl,
            urgency=urgency,
        )
        return True
    except WebPushException as e:
        status = None
        if e.response is not None:
            status = e.response.status_code

        if status in (404, 410):
            logger.warning(f"Souscription expiree, suppression : {sub['endpoint'][:40]}...")
            delete_subscription(sub["endpoint"])
        else:
            logger.error(f"Erreur push : {e}")
        return False
    except Exception as e:
        logger.error(f"Erreur push inattendue : {e}")
        return False


def send_push_to_user(
    user_id: str,
    title: str,
    body: str,
    url: str | None = None,
    icon: str | None = None,
    tag: str | None = None,
) -> dict:
    """Envoie une notification push a toutes les souscriptions d'un utilisateur."""

    subs = get_user_subscriptions(user_id)

    if not subs:
        return {"sent": 0, "failed": 0}

    payload = {
        "title": title,
        "body": body,
        "url": url or "https://frontend-zeta-six-12mzm0ovel.vercel.app/jobs",
        "icon": icon or "/icons/pwa-192x192.png",
        "tag": tag or "job-africa",
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    }

    sent = 0
    failed = 0

    for sub in subs:
        if send_push_to_subscription(sub, payload):
            sent += 1
        else:
            failed += 1

    logger.info(f"Push envoye a {user_id} : {sent} succes, {failed} echecs")

    return {"sent": sent, "failed": failed}


# ==================== Integration alertes ====================
def send_alert_push(alert: dict, jobs: list[dict]) -> dict:
    """Envoie une notification push pour une alerte."""

    user_id = alert.get("user_id")
    alert_nom = alert.get("nom", "Alerte Job Africa")
    count = len(jobs)

    if count == 0:
        return {"sent": 0, "failed": 0}

    title = f"🔔 {count} nouvelle{'s' if count > 1 else ''} offre{'s' if count > 1 else ''}"

    first_job = jobs[0]
    body = f"{alert_nom} — {first_job.get('titre', '')}"

    if first_job.get("entreprise"):
        body += f" chez {first_job['entreprise']}"

    url = f"https://frontend-zeta-six-12mzm0ovel.vercel.app/jobs/{first_job.get('id')}"

    return send_push_to_user(
        user_id=user_id,
        title=title,
        body=body,
        url=url,
        tag=f"alert-{alert.get('id')}",
    )
`;

// ==================== Backend : api/push.py ====================

const PUSH_API = `"""
Routes API pour les notifications push.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.auth import get_current_user
from app.core.push import VAPID_PUBLIC_KEY
from app.services.push_service import (
    delete_subscription,
    save_subscription,
    send_push_to_user,
)


router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key")
def get_vapid_key():
    """Retourne la cle publique VAPID."""
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe(
    request: Request,
    user_agent: str | None = Header(None),
    user=Depends(get_current_user),
):
    """Enregistre une souscription push."""

    subscription = await request.json()

    if not subscription or "endpoint" not in subscription:
        raise HTTPException(400, "Souscription invalide")

    result = save_subscription(
        user_id=user["id"],
        subscription=subscription,
        user_agent=user_agent,
    )

    if not result:
        raise HTTPException(500, "Impossible d'enregistrer la souscription")

    return {"status": "ok", "subscription_id": result.get("id")}


@router.post("/unsubscribe")
async def unsubscribe(request: Request):
    """Supprime une souscription."""

    body = await request.json()
    endpoint = body.get("endpoint")

    if not endpoint:
        raise HTTPException(400, "Endpoint manquant")

    delete_subscription(endpoint)
    return {"status": "ok"}


@router.post("/test")
def test_push(user=Depends(get_current_user)):
    """Envoie une notification de test a l'utilisateur connecte."""

    result = send_push_to_user(
        user_id=user["id"],
        title="🌍 Job Africa — Test",
        body="Les notifications push fonctionnent !",
        url="https://frontend-zeta-six-12mzm0ovel.vercel.app/jobs",
    )

    return {
        "status": "ok" if result["sent"] > 0 else "no_subscription",
        "sent": result["sent"],
        "failed": result["failed"],
    }
`;

// ==================== Frontend : public/sw-push.js ====================

const SW_PUSH = `/**
 * Service Worker — Gestion des notifications push.
 */

self.addEventListener("push", (event) => {
  console.log("[SW] Push recu:", event);

  let data = {
    title: "Job Africa",
    body: "Nouvelle notification",
    url: "/jobs",
    icon: "/icons/pwa-192x192.png",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: "/icons/pwa-192x192.png",
    tag: data.tag || "job-africa",
    data: {
      url: data.url,
      timestamp: data.timestamp,
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: "open", title: "Voir l'offre" },
      { action: "close", title: "Ignorer" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});


self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification cliquee:", event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const urlToOpen = data.url || "/jobs";

  if (action === "close") return;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});


self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Souscription changee:", event);

  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch("/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
  );
});
`;

// ==================== Frontend : services/push.js ====================

const PUSH_SERVICE_JS = `/**
 * Service de gestion des notifications push.
 */

import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
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
`;

// ==================== Frontend : PushPrompt.vue ====================

const PUSH_PROMPT = `<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import pushApi from "@/services/push";

const auth = useAuthStore();

const showPrompt = ref(false);
const permission = ref("default");
const loading = ref(false);
const subscribed = ref(false);
const isSupported = ref(false);

async function checkStatus() {
  isSupported.value = pushApi.isSupported();

  if (!isSupported.value) return;

  permission.value = pushApi.getPermission();

  const sub = await pushApi.getSubscription();
  subscribed.value = !!sub;

  if (auth.isAuthenticated && permission.value === "default" && !subscribed.value) {
    setTimeout(() => {
      showPrompt.value = true;
    }, 5000);
  }
}

async function enable() {
  loading.value = true;

  try {
    await pushApi.requestAndSubscribe();
    subscribed.value = true;
    permission.value = "granted";
    showPrompt.value = false;
  } catch (e) {
    console.error("Erreur activation push:", e);
    permission.value = pushApi.getPermission();
  } finally {
    loading.value = false;
  }
}

function dismiss() {
  showPrompt.value = false;
  localStorage.setItem("push-dismissed", Date.now().toString());
}

function checkDismissed() {
  const last = localStorage.getItem("push-dismissed");
  if (!last) return false;

  const days = (Date.now() - parseInt(last)) / (1000 * 60 * 60 * 24);
  return days < 14;
}

onMounted(() => {
  if (!checkDismissed()) {
    checkStatus();
  }
});
</script>

<template>
  <div
    v-if="showPrompt"
    class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 card p-4 shadow-lg border-brand-200 bg-gradient-to-br from-brand-50 to-white"
  >
    <div class="flex items-start gap-3">
      <div class="text-3xl">🔔</div>
      <div class="flex-1">
        <div class="font-semibold text-slate-800">
          Activer les notifications
        </div>
        <p class="text-xs text-slate-500 mt-1">
          Recevez une alerte dès qu'une nouvelle offre correspond à vos critères.
        </p>
        <div class="flex gap-2 mt-3">
          <button
            class="btn bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
            :disabled="loading"
            @click="enable"
          >
            {{ loading ? "Activation…" : "Activer" }}
          </button>
          <button
            class="text-xs text-slate-500 hover:text-slate-700 px-2"
            @click="dismiss"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/core/push.py": PUSH_CONFIG,
  "backend/app/services/push_service.py": PUSH_SERVICE,
  "backend/app/api/push.py": PUSH_API,
  "frontend/public/sw-push.js": SW_PUSH,
  "frontend/src/services/push.js": PUSH_SERVICE_JS,
  "frontend/src/components/pwa/PushPrompt.vue": PUSH_PROMPT,
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

  if (content.includes("push")) {
    log.info("main.py deja patche (push present)");
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

  // Ajout de "push," dans l'import (après "share,")
  if (content.includes("    share,") && !content.includes("    push,")) {
    content = content.replace(
      /(\s+)share,/,
      "$1share,$1push,"
    );
  }

  // Ajout de app.include_router(push.router)
  if (!content.includes("app.include_router(push.router)")) {
    content = content.replace(
      /app\.include_router\(share\.router\)/,
      "app.include_router(share.router)\napp.include_router(push.router)"
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
  log.banner("MODULE 15 — NOTIFICATIONS PUSH");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
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

  log.banner("MODULE 15 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  DEPENDANCE BACKEND A INSTALLER :");
  console.log("    cd backend");
  console.log("    pip install pywebpush");
  console.log("");
  console.log("  VARIABLES D'ENVIRONNEMENT (backend/.env) :");
  console.log("    VAPID_PUBLIC_KEY=BLojGYLkULaAWVzxeB9Uh9BLNyZ6Kr1yBGW0UTxelDxOJE2jM3LM6dy1k3oiXBlFmFOR8AFnBKkf2v7W1k47E4s");
  console.log("    VAPID_PRIVATE_KEY=b2OIdC7OGZK-MaXCcgk06ja-5zghlAGxUpObHOwLDiw");
  console.log("    VAPID_SUBJECT=mailto:contact@jobafrica.app");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. pip install pywebpush");
  console.log("  2. Ajouter les variables VAPID dans .env");
  console.log("  3. Ajouter <PushPrompt /> dans App.vue");
  console.log("  4. Tester : GET /push/vapid-public-key");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});