from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.main as main_module

client = TestClient(main_module.app)


def test_health_is_public_and_healthy():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


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
    assert response.json()["detail"] == "API configuration is incomplete"


def test_readiness_passes_when_required_configuration_is_present(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "settings",
        SimpleNamespace(
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
