from fastapi import Depends, FastAPI, HTTPException, Request, status
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
    openapi_url="/openapi.json" if settings.app_env != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def security_response_headers(request: Request, call_next):
    """Apply conservative browser security defaults without logging request secrets."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Cache-Control", "no-store")
    if getattr(settings, "app_env", "development") == "production":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
        )
    return response


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness probe: the API process is running."""
    return {"status": "ok", "service": "crestovia-ai-api"}


@app.get("/ready", tags=["health"])
def readiness() -> dict[str, str]:
    """Readiness probe: required auth and safe CORS configuration is present."""
    origins = [origin.strip() for origin in settings.allowed_origins if origin.strip()]
    production = getattr(settings, "app_env", "development") == "production"
    unsafe_production_origins = production and any(
        origin == "*" or not origin.startswith("https://") for origin in origins
    )
    if (
        not settings.supabase_url.strip()
        or not settings.supabase_jwks_url.strip()
        or not origins
        or unsafe_production_origins
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API configuration is incomplete or unsafe",
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
