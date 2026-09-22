"""
Routes API d'authentification.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.auth import (
    AuthResponse,
    AuthUser,
    LoginRequest,
    RefreshRequest,
    SignupRequest,
)
from app.core.supabase import supabase
from app.core.auth import get_current_user, _get_user_role
from app.core.logger import get_logger


logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest):
    """Cree un nouveau compte utilisateur."""

    try:
        response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {"nom": payload.nom} if payload.nom else {},
            },
        })

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inscription echouee",
            )

        session = response.session

        return AuthResponse(
            user=AuthUser(
                id=str(response.user.id),
                email=response.user.email,
                user_role="user",
                nom=payload.nom,
            ),
            access_token=session.access_token if session else "",
            refresh_token=session.refresh_token if session else None,
            expires_in=session.expires_in if session else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur signup : {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    """Connexion avec email et mot de passe."""

    try:
        response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })

        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
            )

        user_role = _get_user_role(str(response.user.id))

        return AuthResponse(
            user=AuthUser(
                id=str(response.user.id),
                email=response.user.email,
                user_role=user_role,
            ),
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur login : {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )


@router.post("/logout")
def logout():
    """Deconnexion."""

    try:
        supabase.auth.sign_out()
        return {"message": "Deconnexion reussie"}
    except Exception as e:
        logger.error(f"Erreur logout : {e}")
        return {"message": "Deconnexion locale"}


@router.get("/me", response_model=AuthUser)
def me(user: dict = Depends(get_current_user)):
    """Retourne l'utilisateur connecte."""

    return AuthUser(
        id=user["id"],
        email=user.get("email"),
        user_role=user.get("user_role", "user"),
    )


@router.post("/refresh", response_model=AuthResponse)
def refresh(payload: RefreshRequest):
    """Rafraichit le token d'acces."""

    try:
        response = supabase.auth.refresh_session(payload.refresh_token)

        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token invalide",
            )

        return AuthResponse(
            user=AuthUser(
                id=str(response.user.id),
                email=response.user.email,
            ),
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
        )

    except Exception as e:
        logger.error(f"Erreur refresh : {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expiree",
        )
