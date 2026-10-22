from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DASHBOARD = ROOT / "apps" / "web" / "app" / "dashboard" / "page.tsx"


def test_workspace_overview_has_one_notifications_shortcut():
    source = DASHBOARD.read_text(encoding="utf-8")
    assert source.count('href="/dashboard/notifications"') == 1
