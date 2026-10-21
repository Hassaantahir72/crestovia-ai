from pathlib import Path
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
REPORT = ROOT / "scripts" / "readiness-report.mjs"


def run_report(*args):
    return subprocess.run(
        ["node", str(REPORT), *args],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def test_readiness_checklist_structure_is_valid():
    result = run_report("--validate")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "six gates, 30 items" in result.stdout


def test_readiness_report_counts_only_explicitly_checked_evidence():
    result = run_report("--json")
    assert result.returncode == 0, result.stdout + result.stderr
    report = json.loads(result.stdout)
    assert report["total"] == 30
    assert report["checked"] + report["pending"] == 30
    assert report["releaseReady"] is False
    assert report["pending"] > 0
    assert any(item["gate"] == "F" and "explicitly approves public deployment" in item["label"] for item in report["pendingItems"])


def test_strict_readiness_mode_fails_closed_while_evidence_is_pending():
    result = run_report("--strict")
    assert result.returncode == 2
    assert "Public deployment remains blocked" in result.stdout
