"""
Configuration des agregateurs de paiement pour l'Afrique de l'Ouest.
"""

import os


# ==================== Agregateur actif ====================
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "kkiapay")


# ==================== KKiaPay ====================
KKIAPAY_PUBLIC_KEY = os.getenv(
    "KKIAPAY_PUBLIC_KEY",
    "832a1e38086dd4c4e3dc0fe21b0d9d37a6dbabd0",
)

KKIAPAY_PRIVATE_KEY = os.getenv(
    "KKIAPAY_PRIVATE_KEY",
    "pk_44447240141f408206f9d2653e7a80d2d3db48a282d3f2a99814d34fb3d40a33",
)

KKIAPAY_SECRET = os.getenv(
    "KKIAPAY_SECRET",
    "sk_c9d670d6db44df1f95517fdf18985860c8eb22e7fae391a161e2edc53b0502ce",
)

KKIAPAY_SANDBOX = os.getenv("KKIAPAY_SANDBOX", "true").lower() == "true"


# ==================== FedaPay (backup) ====================
FEDAPAY_SECRET_KEY = os.getenv("FEDAPAY_SECRET_KEY", "")
FEDAPAY_PUBLIC_KEY = os.getenv("FEDAPAY_PUBLIC_KEY", "")


# ==================== Paystack (backup) ====================
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY", "")


# ==================== Tarifs ====================
TARIFS = {
    "premium_job": {
        "prix": 2000,
        "devise": "XOF",
        "duree_jours": 30,
        "description": "Offre mise en avant pendant 30 jours",
    },
    "subscription_premium": {
        "prix": 5000,
        "devise": "XOF",
        "duree_jours": 30,
        "description": "Abonnement candidat premium - 30 jours",
    },
    "subscription_pro": {
        "prix": 15000,
        "devise": "XOF",
        "duree_jours": 30,
        "description": "Abonnement pro - 30 jours",
    },
    "sponsored_job": {
        "prix": 25000,
        "devise": "XOF",
        "duree_jours": 30,
        "description": "Offre sponsorisee entreprise - 30 jours",
    },
    "banner_week": {
        "prix": 50000,
        "devise": "XOF",
        "duree_jours": 7,
        "description": "Banniere publicitaire - 1 semaine",
    },
}


# ==================== Moyens de paiement par pays ====================
MOYENS_PAR_PAYS = {
    "Benin": [
        {"id": "mtn_momo", "label": "MTN MoMo", "icone": "📱"},
        {"id": "moov_money", "label": "Moov Money", "icone": "📱"},
        {"id": "celtiis", "label": "Celtiis", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Togo": [
        {"id": "flooz", "label": "Flooz (Moov)", "icone": "📱"},
        {"id": "tmoney", "label": "T-Money (Togocom)", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Cote d'Ivoire": [
        {"id": "orange_money", "label": "Orange Money", "icone": "📱"},
        {"id": "mtn_momo", "label": "MTN MoMo", "icone": "📱"},
        {"id": "moov_money", "label": "Moov Money", "icone": "📱"},
        {"id": "wave", "label": "Wave", "icone": "🌊"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Senegal": [
        {"id": "wave", "label": "Wave", "icone": "🌊"},
        {"id": "orange_money", "label": "Orange Money", "icone": "📱"},
        {"id": "free_money", "label": "Free Money", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Niger": [
        {"id": "airtel_money", "label": "Airtel Money", "icone": "📱"},
        {"id": "orange_money", "label": "Orange Money", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Ghana": [
        {"id": "mtn_momo", "label": "MTN MoMo", "icone": "📱"},
        {"id": "vodafone_cash", "label": "Vodafone Cash", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Nigeria": [
        {"id": "paystack", "label": "Paystack", "icone": "💳"},
        {"id": "flutterwave", "label": "Flutterwave", "icone": "💳"},
        {"id": "bank_transfer", "label": "Virement bancaire", "icone": "🏦"},
    ],
}