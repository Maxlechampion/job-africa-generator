"""
Middleware pour la detection de la langue.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.i18n import get_lang


class LanguageMiddleware(BaseHTTPMiddleware):
    """Injecte la langue detectee dans request.state.lang."""

    async def dispatch(self, request: Request, call_next):
        accept = request.headers.get("accept-language")
        request.state.lang = get_lang(accept)

        response = await call_next(request)
        response.headers["Content-Language"] = request.state.lang

        return response
