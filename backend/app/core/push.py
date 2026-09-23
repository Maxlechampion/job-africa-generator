"""
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
