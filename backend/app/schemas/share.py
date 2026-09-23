"""
Schemas Pydantic pour le partage social.
"""

from datetime import datetime

from pydantic import BaseModel


class ShareCreate(BaseModel):
    job_id: int
    canal: str  # whatsapp, linkedin, facebook, twitter, telegram, email, copy, native, other
    referrer: str | None = None


class ShareStats(BaseModel):
    job_id: int
    total_partages: int
    whatsapp: int
    linkedin: int
    facebook: int
    copies: int
    dernier_partage: datetime | None = None


class ShareResponse(BaseModel):
    success: bool
    message: str


class JobOGData(BaseModel):
    title: str
    description: str
    url: str
    image: str | None = None
    site_name: str = "Job Africa"
    locale: str = "fr_FR"
