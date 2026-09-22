"""
Detection du niveau d'experience (Junior / Mid / Senior).
"""

import re


PATTERNS = {
    "Stage": [
        r"\b(stage|stagiaire|internship|intern|trainee)\b",
    ],
    "Junior": [
        r"\b(junior|debutant|debutante|entry[- ]?level)\b",
        r"\b(jeune diplome|jeune diplôme)\b",
        r"\b0[- ]?[23] ans? d'experience\b",
    ],
    "Senior": [
        r"\b(senior|confirme|confirmee|expert|experte)\b",
        r"\b(lead|principal)\b",
        r"\b[5-9]\+? ans? d'experience\b",
        r"\b10\+? ans?\b",
        r"\b(director|head of|vp|vice[- ]president)\b",
    ],
    "Mid": [
        r"\b(mid[- ]?level|intermediaire)\b",
        r"\b[3-4]\+? ans? d'experience\b",
    ],
}


def detect_experience(job: dict) -> str | None:
    """Detecte le niveau d'experience."""

    texte = (
        f"{job.get('titre', '')} "
        f"{job.get('description', '') or ''}"
    ).lower()

    for niveau, regexes in PATTERNS.items():
        for regex in regexes:
            if re.search(regex, texte, re.IGNORECASE):
                return niveau

    return None