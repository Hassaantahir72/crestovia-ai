from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def test_render_blueprint_does_not_implicitly_deploy_after_source_changes():
    source = (ROOT / "render.yaml").read_text(encoding="utf-8")
    assert "autoDeploy: false" in source
    assert "autoDeploy: true" not in source


def test_preview_instructions_require_explicit_owner_approval():
    source = (ROOT / "docs" / "deployment" / "LIVE_PREVIEW_SETUP.md").read_text(encoding="utf-8")
    assert "requires explicit owner approval" in source
    assert "Do not trigger a deploy until the owner has explicitly approved" in source
    assert "Automatic deploys remain disabled until separately authorized." in source
