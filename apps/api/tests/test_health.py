from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.main as main_module

client = TestClient(main_module.app)


def test_health_is_public_and_healthy():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_responses_include_security_headers():
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert response.headers["permissions-policy"] == "camera=(), microphone=(), geolocation=()"
    assert response.headers["cache-control"] == "no-store"


def test_readiness_returns_503_when_required_configuration_is_missing(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "settings",
        SimpleNamespace(
            supabase_url="",
            supabase_jwks_url="",
            allowed_origins=["http://localhost:3000"],
        ),
    )
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["detail"] == "API configuration is incomplete or unsafe"


def test_readiness_returns_503_when_cors_origins_are_blank(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "settings",
        SimpleNamespace(
            supabase_url="https://project.supabase.co",
            supabase_jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
            allowed_origins=["", "   "],
        ),
    )
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["detail"] == "API configuration is incomplete or unsafe"


def test_production_readiness_rejects_wildcard_cors(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "settings",
        SimpleNamespace(
            app_env="production",
            supabase_url="https://project.supabase.co",
            supabase_jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
            allowed_origins=["*"],
        ),
    )
    response = client.get("/ready")
    assert response.status_code == 503


def test_production_readiness_rejects_plain_http_origins(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "settings",
        SimpleNamespace(
            app_env="production",
            supabase_url="https://project.supabase.co",
            supabase_jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
            allowed_origins=["http://company.example"],
        ),
    )
    response = client.get("/ready")
    assert response.status_code == 503


def test_readiness_passes_when_required_configuration_is_present(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "settings",
        SimpleNamespace(
            app_env="production",
            supabase_url="https://project.supabase.co",
            supabase_jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
            allowed_origins=["https://company.example"],
        ),
    )
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "service": "crestovia-ai-api"}


def test_me_requires_bearer_token():
    response = client.get("/api/v1/me")
    assert response.status_code == 401
