from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_is_public_and_healthy():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_me_requires_bearer_token():
    response = client.get("/api/v1/me")
    assert response.status_code == 401
