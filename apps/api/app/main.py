from fastapi import Depends, FastAPI
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
    return {"status": "ok", "service": "crestovia-ai-api"}


@app.get(f"{settings.api_prefix}/me", tags=["identity"])
def me(claims: dict = Depends(get_current_user)) -> dict:
    return {
        "user_id": claims["sub"],
        "email": claims.get("email"),
        "role": claims.get("role"),
        "authenticated": True,
    }
