from pathlib import Path
import json
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[3]
VERIFIER = ROOT / "scripts" / "verify-source-archive.py"


def make_archive(tmp_path, files):
    archive = tmp_path / "source.zip"
    entries = {
        "apps/web/package.json": json.dumps({"version": "0.2.75"}),
        "CHANGELOG.md": "## v0.2.75 — Test release\\n",
    }
    entries.update(files)
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zipped:
        for name, content in entries.items():
            zipped.writestr(name, content)
    return archive


def run_verifier(archive):
    return subprocess.run(
        [sys.executable, str(VERIFIER), str(archive)],
        check=False,
        capture_output=True,
        text=True,
    )


def test_source_archive_accepts_safe_source_and_env_examples(tmp_path):
    archive = make_archive(
        tmp_path,
        {
            "README.md": "# Crestovia AI",
            ".env.example": "GROQ_API_KEY=configure_privately_when_ready\n",
            "apps/api/.env.example": "APP_ENV=development\n",
            "apps/web/.env.local.example": "NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co\n",
        },
    )
    result = run_verifier(archive)
    assert result.returncode == 0
    assert "verification passed" in result.stdout


def test_source_archive_rejects_real_local_env_files(tmp_path):
    archive = make_archive(tmp_path, {".env.production": "APP_ENV=production\n"})
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "local environment file included" in result.stdout
    assert "production-secret-value" not in result.stdout


def test_source_archive_rejects_recognizable_provider_tokens_without_echoing_them(tmp_path):
    token = "gsk_" + "A" * 32
    archive = make_archive(tmp_path, {"config.ts": f'const key = "{token}";\n'})
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "credential or private key detected" in result.stdout
    assert token not in result.stdout


def test_source_archive_rejects_private_key_material(tmp_path):
    archive = make_archive(
        tmp_path,
        {"private.pem": "-----BEGIN PRIVATE " + "KEY-----\nnot-a-real-key\n"},
    )
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "credential or private key detected" in result.stdout


def test_source_archive_rejects_development_artifacts_and_unsafe_paths(tmp_path):
    archive = make_archive(
        tmp_path,
        {
            "apps/web/node_modules/pkg/index.js": "module.exports = {};",
            "../outside.txt": "not safe",
        },
    )
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "development artifact included" in result.stdout
    assert "unsafe archive path" in result.stdout


def test_source_archive_rejects_invalid_zip(tmp_path):
    archive = tmp_path / "broken.zip"
    archive.write_text("not a zip", encoding="utf-8")
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "cannot be opened as a ZIP file" in result.stdout



def test_source_archive_rejects_package_and_changelog_version_mismatch(tmp_path):
    archive = make_archive(
        tmp_path,
        {"apps/web/package.json": json.dumps({"version": "9.9.9"})},
    )
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "release version mismatch between package manifest and changelog" in result.stdout


def test_source_archive_rejects_additional_common_provider_tokens_without_echoing_them(tmp_path):
    tokens = [
        "sk_live_" + "A" * 24,
        "rk_test_" + "B" * 24,
        "xoxb-" + "C" * 30,
        "glpat-" + "D" * 24,
        "npm_" + "E" * 36,
    ]
    archive = make_archive(tmp_path, {"credentials.txt": "\n".join(tokens)})
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "credential or private key detected" in result.stdout
    assert all(token not in result.stdout for token in tokens)


def test_source_archive_rejects_members_that_would_skip_credential_scanning(tmp_path):
    archive = make_archive(tmp_path, {"large-source.txt": "A" * 2_000_001})
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "archive member exceeds credential scan size limit" in result.stdout


def test_source_archive_rejects_credentialed_database_urls_without_echoing_password(tmp_path):
    password = "supersecretvalue123"
    url = f"postgresql://app_user:{password}@db.example.invalid:5432/crestovia"
    archive = make_archive(tmp_path, {"database-url.txt": url})
    result = run_verifier(archive)
    assert result.returncode == 1
    assert "credential or private key detected" in result.stdout
    assert password not in result.stdout
