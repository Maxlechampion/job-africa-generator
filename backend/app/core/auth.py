"""
Dépendances d'authentification FastAPI.

Vérifie les JWT Supabase et expose :
    - get_current_user : utilisateur authentifié
    - require_admin : utilisateur avec rôle admin
    - optional_user : utilisateur ou None
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.logger import get_logger
from app.core.supabase import supabase

logger = get_logger(__name__)

security = HTTPBearer(auto_error=False)


def _extract_token(credentials: HTTPAuthorizationCredentials | None) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def _get_user_role(user_id: str) -> str:
    """
    Récupère le rôle le plus élevé de l'utilisateur.
    Un utilisateur peut avoir plusieurs rôles (user + admin).
    On retourne toujours le plus élevé : admin > user.
    """

    try:
        r = supabase.table("user_roles").select("role").eq("user_id", user_id).execute()

        if not r or not r.data:
            return "user"

        # Récupère tous les rôles
        roles = [row.get("role") for row in r.data if row.get("role")]

        if not roles:
            return "user"

        # Priorité : admin > user
        if "admin" in roles:
            return "admin"

        return roles[0]

    except Exception as e:
        logger.warning(f"Impossible de lire le rôle de {user_id} : {e}")

    return "user"


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Vérifie le JWT Supabase et retourne l'utilisateur."""

    token = _extract_token(credentials)

    try:
        response = supabase.auth.get_user(token)

        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide ou expiré",
            )

        user = response.user
        user_role = _get_user_role(str(user.id))

        return {
            "id": str(user.id),
            "email": user.email,
            "user_role": user_role,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur validation token : {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification échouée",
        )


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Vérifie que l'utilisateur est admin."""

    if user.get("user_role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès admin requis",
        )

    return user


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """Retourne l'utilisateur si connecté, None sinon."""

    if not credentials or not credentials.credentials:
        return None

    try:
        return get_current_user(credentials)
    except HTTPException:
        return None
