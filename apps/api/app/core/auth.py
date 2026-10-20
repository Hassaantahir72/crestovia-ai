from typing import Any
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    settings = get_settings()
    if credentials is None:
        raise HTTPException(status_code=401, detail="Bearer access token required")
    if not settings.supabase_jwks_url or not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Authentication verifier is not configured")

    try:
        jwks_client = PyJWKClient(settings.supabase_jwks_url, cache_keys=True)
        signing_key = jwks_client.get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=f"{settings.supabase_url.rstrip('/')}/auth/v1",
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
        if not claims.get("sub"):
            raise jwt.InvalidTokenError("Missing subject")
        return claims
    except Exception as exc:
        # Avoid leaking verifier details or token contents to clients.
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc
