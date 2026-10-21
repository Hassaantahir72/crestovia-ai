from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.auth import get_current_user
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(
    title="Crestovia AI API",
    version="0.1.0",
    description="Crestovia AI foundation API",
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness probe: the API process is running."""
    return {"status": "ok", "service": "crestovia-ai-api"}


@app.get("/ready", tags=["health"])
def readiness() -> dict[str, str]:
    """Readiness probe: required auth-verifier and CORS configuration is present."""
    if (
        not settings.supabase_url.strip()
        or not settings.supabase_jwks_url.strip()
        or not any(origin.strip() for origin in settings.allowed_origins)
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API configuration is incomplete",
        )
    return {"status": "ready", "service": "crestovia-ai-api"}


@app.get(f"{settings.api_prefix}/me", tags=["identity"])
def me(claims: dict = Depends(get_current_user)) -> dict:
    return {
        "user_id": claims["sub"],
        "email": claims.get("email"),
        "role": claims.get("role"),
        "authenticated": True,
    }
