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


def test_readme_operations_section_uses_real_line_breaks():
    source = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "\\n" not in source
    assert "- Deployment smoke checks, local backup archive verification" in source
    assert "Operational guidance:" in source


def test_build_status_matches_current_package_and_merged_baseline():
    import json

    package = json.loads((ROOT / "apps" / "web" / "package.json").read_text(encoding="utf-8"))
    status = (ROOT / "docs" / "BUILD_STATUS.md").read_text(encoding="utf-8")
    assert package["version"] == "0.2.85"
    assert "**Project version:** 0.2.85" in status
    assert "**Baseline commit:** 1b2d0a949dd80d651d338fcbb895b3804e701030 (v0.2.84 merged)" in status
