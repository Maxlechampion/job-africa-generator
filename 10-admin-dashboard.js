#!/usr/bin/env node

/**
 * MODULE 10 — DASHBOARD ADMIN avec Chart.js
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
};

const MODULE_ID = "10";
const MODULE_NAME = "Dashboard Admin";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "frontend/src/views",
  "frontend/src/services",
];

// ==================== BACKEND ====================

const DASHBOARD_SCHEMA = `"""
Schemas Pydantic pour le dashboard admin.
"""

from typing import Optional
from pydantic import BaseModel


class KPISchema(BaseModel):
    total_offres: int
    total_sources: int
    total_sources_actives: int
    total_companies: int
    total_skills: int
    offres_7j: int
    offres_30j: int


class DailyCount(BaseModel):
    jour: str
    total: int


class TopItem(BaseModel):
    label: str
    total: int
    extra: Optional[str] = None


class DashboardResponse(BaseModel):
    kpi: KPISchema
    daily: list[DailyCount]
    top_skills: list[TopItem]
    top_pays: list[TopItem]
    sources: list[dict]
    logs: list[dict]
`;

const DASHBOARD_SERVICE = `"""
Service du dashboard admin.
"""

from datetime import datetime, timezone, timedelta

from app.core.supabase import supabase
from app.core.logger import get_logger


logger = get_logger(__name__)


def get_kpi() -> dict:
    """KPI principaux."""

    def count(table: str, **filters) -> int:
        q = supabase.table(table).select("id", count="exact")
        for k, v in filters.items():
            q = q.eq(k, v)
        r = q.execute()
        return r.count or 0

    now = datetime.now(timezone.utc)

    r_7j = (
        supabase.table("jobs")
        .select("id", count="exact")
        .gte("created_at", (now - timedelta(days=7)).isoformat())
        .execute()
    )

    r_30j = (
        supabase.table("jobs")
        .select("id", count="exact")
        .gte("created_at", (now - timedelta(days=30)).isoformat())
        .execute()
    )

    return {
        "total_offres": count("jobs"),
        "total_sources": count("sources"),
        "total_sources_actives": count("sources", actif=True),
        "total_companies": count("companies"),
        "total_skills": count("skills"),
        "offres_7j": r_7j.count or 0,
        "offres_30j": r_30j.count or 0,
    }


def get_daily_counts(days: int = 30) -> list[dict]:
    """Offres par jour (30 derniers jours)."""

    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    r = (
        supabase.table("jobs")
        .select("created_at")
        .gte("created_at", since)
        .execute()
    )

    counts: dict[str, int] = {}
    for row in r.data or []:
        created = row.get("created_at", "")
        if not created:
            continue
        day = created[:10]
        counts[day] = counts.get(day, 0) + 1

    result = []
    today = datetime.now(timezone.utc).date()

    for i in range(days - 1, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        result.append({"jour": day, "total": counts.get(day, 0)})

    return result


def get_top_skills(limit: int = 15) -> list[dict]:
    """Top competences."""

    r = (
        supabase.table("job_skills")
        .select("skill_id, skills(nom, categorie)")
        .execute()
    )

    counts: dict[int, dict] = {}

    for row in r.data or []:
        skill = row.get("skills") or {}
        sid = row.get("skill_id")
        if not sid or not skill.get("nom"):
            continue

        if sid not in counts:
            counts[sid] = {
                "label": skill["nom"],
                "total": 0,
                "extra": skill.get("categorie"),
            }
        counts[sid]["total"] += 1

    return sorted(counts.values(), key=lambda x: x["total"], reverse=True)[:limit]


def get_top_pays(limit: int = 10) -> list[dict]:
    """Top pays."""

    r = supabase.table("jobs").select("pays").execute()

    counts: dict[str, int] = {}
    for row in r.data or []:
        p = row.get("pays")
        if p:
            counts[p] = counts.get(p, 0) + 1

    return sorted(
        [{"label": k, "total": v} for k, v in counts.items()],
        key=lambda x: x["total"],
        reverse=True,
    )[:limit]


def get_sources_status() -> list[dict]:
    """Statut des sources."""

    r = (
        supabase.table("sources")
        .select("*")
        .order("nom")
        .execute()
    )

    return [
        {
            "id": s["id"],
            "nom": s["nom"],
            "type": s["type"],
            "actif": s.get("actif", True),
            "derniere_collecte": s.get("derniere_collecte"),
            "dernier_statut": s.get("dernier_statut"),
            "nombre_offres_total": s.get("nombre_offres_total", 0),
        }
        for s in r.data or []
    ]


def get_recent_logs(limit: int = 20) -> list[dict]:
    """Derniers logs."""

    r = (
        supabase.table("collect_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return r.data or []


def get_dashboard() -> dict:
    """Dashboard complet."""

    return {
        "kpi": get_kpi(),
        "daily": get_daily_counts(30),
        "top_skills": get_top_skills(15),
        "top_pays": get_top_pays(10),
        "sources": get_sources_status(),
        "logs": get_recent_logs(20),
    }
`;

const DASHBOARD_API = `"""
Routes API pour le dashboard admin.
"""

from fastapi import APIRouter

from app.services.dashboard_service import (
    get_daily_counts,
    get_dashboard,
    get_kpi,
    get_recent_logs,
    get_sources_status,
    get_top_pays,
    get_top_skills,
)


router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("")
def dashboard():
    """Dashboard complet."""
    return get_dashboard()


@router.get("/kpi")
def kpi():
    return get_kpi()


@router.get("/daily")
def daily(days: int = 30):
    return get_daily_counts(days)


@router.get("/top-skills")
def top_skills(limit: int = 15):
    return get_top_skills(limit)


@router.get("/top-pays")
def top_pays(limit: int = 10):
    return get_top_pays(limit)


@router.get("/sources")
def sources():
    return get_sources_status()


@router.get("/logs")
def logs(limit: int = 20):
    return get_recent_logs(limit)
`;

// ==================== FRONTEND ====================

const DASHBOARD_SERVICE_FE = `import axios from "axios";

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
`;

const ADMIN_KPI = `<script setup>
defineProps({
  kpi: { type: Object, required: true },
});

const cards = [
  { key: "total_offres", label: "Offres totales", icon: "💼", color: "brand" },
  { key: "offres_7j", label: "Offres 7 jours", icon: "📈", color: "sky" },
  { key: "total_sources_actives", label: "Sources actives", icon: "📡", color: "emerald" },
  { key: "total_skills", label: "Competences", icon: "🧠", color: "amber" },
  { key: "total_companies", label: "Entreprises", icon: "🏢", color: "purple" },
  { key: "offres_30j", label: "Offres 30 jours", icon: "📊", color: "rose" },
];

const colors = {
  brand: "bg-brand-50 text-brand-700",
  sky: "bg-sky-50 text-sky-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  purple: "bg-purple-50 text-purple-700",
  rose: "bg-rose-50 text-rose-700",
};
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    <div v-for="c in cards" :key="c.key" class="card p-4">
      <div
        :class="['w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-2', colors[c.color]]"
      >
        {{ c.icon }}
      </div>
      <div class="text-2xl font-bold text-slate-800">
        {{ kpi[c.key] ?? "—" }}
      </div>
      <div class="text-xs text-slate-500 mt-0.5">{{ c.label }}</div>
    </div>
  </div>
</template>
`;

const ADMIN_CHART = `<script setup>
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

const props = defineProps({
  data: { type: Array, default: () => [] },
});

const chartData = computed(() => ({
  labels: props.data.map((d) => {
    const date = new Date(d.jour);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  }),
  datasets: [
    {
      label: "Offres / jour",
      data: props.data.map((d) => d.total),
      borderColor: "#2f8f5c",
      backgroundColor: "rgba(47, 143, 92, 0.1)",
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "#f1f5f9" },
      ticks: { color: "#94a3b8", font: { size: 11 } },
    },
    x: {
      grid: { display: false },
      ticks: { color: "#94a3b8", font: { size: 11 } },
    },
  },
};
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      📈 Offres collectees (30 derniers jours)
    </h3>
    <div style="height: 280px">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
`;

const ADMIN_TOP_SKILLS = `<script setup>
import { computed } from "vue";

const props = defineProps({
  skills: { type: Array, default: () => [] },
});

const max = computed(() =>
  Math.max(...props.skills.map((s) => s.total), 1)
);
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      🧠 Top competences
    </h3>

    <div v-if="!skills.length" class="text-sm text-slate-500 py-4">
      Aucune donnee.
    </div>

    <div v-else class="space-y-3">
      <div v-for="s in skills" :key="s.label">
        <div class="flex items-center justify-between text-sm mb-1">
          <span class="font-medium text-slate-700 truncate">
            {{ s.label }}
          </span>
          <span class="text-slate-500 text-xs">{{ s.total }}</span>
        </div>
        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-brand-500 rounded-full transition-all"
            :style="{ width: (s.total / max) * 100 + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
`;

const ADMIN_TOP_COUNTRIES = `<script setup>
import { computed } from "vue";
import { countryFlag } from "@/utils/format";

const props = defineProps({
  countries: { type: Array, default: () => [] },
});

const max = computed(() =>
  Math.max(...props.countries.map((c) => c.total), 1)
);
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      🌍 Top pays
    </h3>

    <div v-if="!countries.length" class="text-sm text-slate-500 py-4">
      Aucune donnee.
    </div>

    <div v-else class="space-y-3">
      <div v-for="c in countries" :key="c.label">
        <div class="flex items-center justify-between text-sm mb-1">
          <span class="font-medium text-slate-700">
            {{ countryFlag(c.label) }} {{ c.label }}
          </span>
          <span class="text-slate-500 text-xs">{{ c.total }}</span>
        </div>
        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-amber-500 rounded-full transition-all"
            :style="{ width: (c.total / max) * 100 + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
`;

const ADMIN_SOURCES = `<script setup>
import { timeAgo } from "@/utils/format";

defineProps({
  sources: { type: Array, default: () => [] },
});

const statusColors = {
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
  partial: "bg-amber-50 text-amber-700",
};
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      📡 Sources
    </h3>

    <div v-if="!sources.length" class="text-sm text-slate-500 py-4">
      Aucune source.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
            <th class="py-2 pr-3">Nom</th>
            <th class="py-2 pr-3">Type</th>
            <th class="py-2 pr-3">Statut</th>
            <th class="py-2 pr-3">Derniere</th>
            <th class="py-2 pr-3 text-right">Offres</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in sources"
            :key="s.id"
            class="border-b border-slate-50 last:border-0"
          >
            <td class="py-3 pr-3 font-medium text-slate-800">{{ s.nom }}</td>
            <td class="py-3 pr-3">
              <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                {{ s.type }}
              </span>
            </td>
            <td class="py-3 pr-3">
              <span
                :class="[
                  'px-2 py-0.5 rounded text-xs',
                  statusColors[s.dernier_statut] || 'bg-slate-100 text-slate-500',
                ]"
              >
                {{ s.dernier_statut || "—" }}
              </span>
            </td>
            <td class="py-3 pr-3 text-slate-500 text-xs">
              {{ s.derniere_collecte ? timeAgo(s.derniere_collecte) : "Jamais" }}
            </td>
            <td class="py-3 pr-3 text-right font-medium">
              {{ s.nombre_offres_total }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
`;

const ADMIN_LOGS = `<script setup>
import { timeAgo } from "@/utils/format";

defineProps({
  logs: { type: Array, default: () => [] },
});

const statusColors = {
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
  partial: "bg-amber-50 text-amber-700",
};
</script>

<template>
  <div class="card p-5">
    <h3 class="font-semibold text-slate-800 mb-4">
      📋 Dernieres collectes
    </h3>

    <div v-if="!logs.length" class="text-sm text-slate-500 py-4">
      Aucun log.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="l in logs"
        :key="l.id"
        class="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
      >
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-800 truncate">
            {{ l.source_nom || "—" }}
          </div>
          <div class="text-xs text-slate-400">
            {{ timeAgo(l.created_at) }}
            <span v-if="l.duree_secondes">
              · {{ l.duree_secondes.toFixed(1) }}s
            </span>
          </div>
        </div>

        <div class="text-right text-xs">
          <span
            :class="[
              'px-2 py-0.5 rounded',
              statusColors[l.statut] || 'bg-slate-100',
            ]"
          >
            {{ l.statut }}
          </span>
          <div class="text-slate-500 mt-1">
            +{{ l.offres_inserees }} / {{ l.offres_collectees }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
`;

const ADMIN_VIEW = `<script setup>
import { onMounted, ref } from "vue";

import AdminKPI from "@/components/admin/AdminKPI.vue";
import AdminChart from "@/components/admin/AdminChart.vue";
import AdminTopSkills from "@/components/admin/AdminTopSkills.vue";
import AdminTopCountries from "@/components/admin/AdminTopCountries.vue";
import AdminSources from "@/components/admin/AdminSources.vue";
import AdminLogs from "@/components/admin/AdminLogs.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseSpinner from "@/components/ui/BaseSpinner.vue";

import dashboardApi from "@/services/dashboard";
import api from "@/services/api";

const data = ref(null);
const loading = ref(true);
const refreshing = ref(false);

async function load() {
  loading.value = true;
  try {
    data.value = await dashboardApi.getDashboard();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  refreshing.value = true;
  await load();
  refreshing.value = false;
}

async function triggerCollect() {
  if (!confirm("Lancer une collecte manuelle ?")) return;

  refreshing.value = true;
  try {
    await api.triggerCollect();
    await load();
  } finally {
    refreshing.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="container-page py-8">
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-800">
          📊 Dashboard Admin
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Vue d'ensemble de la plateforme Job Africa
        </p>
      </div>

      <div class="flex gap-2">
        <BaseButton variant="outline" :disabled="refreshing" @click="refresh">
          {{ refreshing ? "Chargement…" : "🔄 Actualiser" }}
        </BaseButton>
        <BaseButton :disabled="refreshing" @click="triggerCollect">
          🚀 Lancer une collecte
        </BaseButton>
      </div>
    </div>

    <BaseSpinner v-if="loading" />

    <div v-else-if="data" class="space-y-6">
      <AdminKPI :kpi="data.kpi" />

      <AdminChart :data="data.daily" />

      <div class="grid md:grid-cols-2 gap-6">
        <AdminTopSkills :skills="data.top_skills" />
        <AdminTopCountries :countries="data.top_pays" />
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <AdminSources :sources="data.sources" />
        <AdminLogs :logs="data.logs" />
      </div>
    </div>
  </div>
</template>
`;

const ROUTER_ADDITION = `// Ajout de la route admin dans le router
`;

// ==================== Fichiers ====================

const FILES = {
  // Backend
  "backend/app/schemas/dashboard.py": DASHBOARD_SCHEMA,
  "backend/app/services/dashboard_service.py": DASHBOARD_SERVICE,
  "backend/app/api/dashboard.py": DASHBOARD_API,

  // Frontend services
  "frontend/src/services/dashboard.js": DASHBOARD_SERVICE_FE,

  // Frontend composants admin
  "frontend/src/components/admin/AdminKPI.vue": ADMIN_KPI,
  "frontend/src/components/admin/AdminChart.vue": ADMIN_CHART,
  "frontend/src/components/admin/AdminTopSkills.vue": ADMIN_TOP_SKILLS,
  "frontend/src/components/admin/AdminTopCountries.vue": ADMIN_TOP_COUNTRIES,
  "frontend/src/components/admin/AdminSources.vue": ADMIN_SOURCES,
  "frontend/src/components/admin/AdminLogs.vue": ADMIN_LOGS,

  // Frontend vue
  "frontend/src/views/AdminView.vue": ADMIN_VIEW,
};

// ==================== Patch de main.py ====================

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) return false;

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("dashboard")) {
    log.info("main.py deja patche (dashboard present)");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "main.py"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  let modified = false;

  // Import
  const importRegex = /from app\.api import ([^\n]+)/;
  const match = content.match(importRegex);

  if (match && !match[1].includes("dashboard")) {
    content = content.replace(
      importRegex,
      `from app.api import ${match[1]}, dashboard`
    );
    modified = true;
  }

  // Include router
  if (!content.includes("app.include_router(dashboard.router)")) {
    const lastIncludeRegex = /app\.include_router\((\w+)\.router\)(?!\napp\.include_router)/g;
    const includes = content.match(lastIncludeRegex);

    if (includes && includes.length > 0) {
      const lastIncludeStr = includes[includes.length - 1];
      content = content.replace(
        lastIncludeStr,
        lastIncludeStr + "\napp.include_router(dashboard.router)"
      );
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf8");
    log.file(mainPath + " (patché)", "overwritten");
  }

  return modified;
}

// ==================== Patch du router Vue ====================

function patchRouter() {
  const routerPath = "frontend/src/router/index.js";
  const fullPath = path.join(ROOT, routerPath);

  if (!fs.existsSync(fullPath)) return false;

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("admin")) {
    log.info("Router Vue deja patche");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "frontend", "src", "router");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "index.js"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  // Ajoute la route admin après la route stats
  const statsRouteRegex = /(\s*\{\s*path:\s*"\/stats"[^}]*\},)/;

  if (statsRouteRegex.test(content)) {
    content = content.replace(
      statsRouteRegex,
      `$1
  {
    path: "/admin",
    name: "admin",
    component: () => import("@/views/AdminView.vue"),
    meta: { title: "Admin" },
  },`
    );

    fs.writeFileSync(fullPath, content, "utf8");
    log.file(routerPath + " (patché)", "overwritten");
    return true;
  }

  return false;
}

// ==================== Patch du header ====================

function patchHeader() {
  const headerPath = "frontend/src/components/layout/AppHeader.vue";
  const fullPath = path.join(ROOT, headerPath);

  if (!fs.existsSync(fullPath)) return false;

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes('to="/admin"')) {
    log.info("Header deja patche");
    return true;
  }

  // Ajoute le lien admin
  content = content.replace(
    /const links = \[([^\]]+)\];/,
    (match, inner) => {
      return `const links = [${inner}, { to: "/admin", label: "Admin" }];`;
    }
  );

  fs.writeFileSync(fullPath, content, "utf8");
  log.file(headerPath + " (patché)", "overwritten");
  return true;
}

// ==================== Patch package.json ====================

function patchPackageJson() {
  const pkgPath = "frontend/package.json";
  const fullPath = path.join(ROOT, pkgPath);

  if (!fs.existsSync(fullPath)) return false;

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("chart.js")) {
    log.info("package.json deja patche (chart.js present)");
    return true;
  }

  try {
    const pkg = JSON.parse(content);
    pkg.dependencies["chart.js"] = "^4.4.6";
    pkg.dependencies["vue-chartjs"] = "^5.3.2";

    fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2), "utf8");
    log.file(pkgPath + " (patché)", "overwritten");
    return true;
  } catch (e) {
    log.warn(`Erreur patch package.json : ${e.message}`);
    return false;
  }
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 10 — DASHBOARD ADMIN");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    for (const file of Object.keys(FILES)) {
      if (exists(file)) {
        if (!OPTIONS.dryRun) removeFile(file);
        log.file(file, "removed");
      }
    }
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    log.banner("MODULE 10 — DESINSTALLE");
    return;
  }

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

  log.section("Patch backend (main.py)");
  patchMainPy();

  log.section("Patch router Vue");
  patchRouter();

  log.section("Patch header Vue");
  patchHeader();

  log.section("Patch package.json");
  patchPackageJson();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 10 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  ───────────────────────────────────────");
  console.log("");
  console.log("  1. Installer chart.js + vue-chartjs :");
  console.log("     cd frontend");
  console.log("     npm install");
  console.log("");
  console.log("  2. Relancer Uvicorn (backend)");
  console.log("");
  console.log("  3. Relancer le frontend :");
  console.log("     npm run dev");
  console.log("");
  console.log("  4. Ouvrir :");
  console.log("     http://localhost:5173/admin");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  process.exit(1);
});