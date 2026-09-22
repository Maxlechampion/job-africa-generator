"""
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
