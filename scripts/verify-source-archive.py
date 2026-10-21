#!/usr/bin/env python3
"""Fail-closed checks for the distributable Crestovia AI source archive."""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import PurePosixPath

ALLOWED_ENV_EXAMPLES = {
    ".env.example",
    "apps/api/.env.example",
    "apps/web/.env.local.example",
}
FORBIDDEN_PARTS = {".git", "node_modules", ".next", ".venv", "venv", "__pycache__"}
SECRET_PATTERNS = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{30,}\b"),
    re.compile(r"\bgsk_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bre_[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bAIza[0-9A-Za-z_-]{30,}\b"),
    re.compile(r"\bsb_secret_[A-Za-z0-9_-]{20,}\b"),
)
MAX_SCAN_BYTES = 2_000_000


def verify_archive(archive_path: str) -> list[str]:
    problems: list[str] = []
    try:
        archive = zipfile.ZipFile(archive_path)
    except (OSError, zipfile.BadZipFile):
        return ["archive cannot be opened as a ZIP file"]

    with archive:
        damaged = archive.testzip()
        if damaged is not None:
            problems.append("ZIP integrity check failed")
            return problems

        for info in archive.infolist():
            if info.is_dir():
                continue
            name = info.filename
            path = PurePosixPath(name)
            if path.is_absolute() or ".." in path.parts:
                problems.append("unsafe archive path")
                continue
            if any(part in FORBIDDEN_PARTS for part in path.parts):
                problems.append(f"development artifact included: {name}")
            basename = path.name
            if (basename == ".env" or basename.startswith(".env.") or basename == ".env.local") and name not in ALLOWED_ENV_EXAMPLES:
                problems.append(f"local environment file included: {name}")
            if info.file_size > MAX_SCAN_BYTES:
                continue
            try:
                content = archive.read(info).decode("utf-8")
            except (UnicodeDecodeError, RuntimeError, OSError):
                continue
            if any(pattern.search(content) for pattern in SECRET_PATTERNS):
                problems.append(f"recognizable credential or private key detected: {name}")

        required_metadata = {"apps/web/package.json", "CHANGELOG.md"}
        names = {info.filename for info in archive.infolist() if not info.is_dir()}
        if not required_metadata.issubset(names):
            problems.append("release metadata missing from source archive")
        else:
            try:
                manifest = json.loads(archive.read("apps/web/package.json").decode("utf-8"))
                changelog = archive.read("CHANGELOG.md").decode("utf-8")
                package_version = manifest.get("version")
                heading = re.search(r"^## v(\d+\.\d+\.\d+)\b", changelog, re.MULTILINE)
                if not isinstance(package_version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", package_version):
                    problems.append("package manifest version is invalid")
                elif not heading or heading.group(1) != package_version:
                    problems.append("release version mismatch between package manifest and changelog")
            except (UnicodeDecodeError, json.JSONDecodeError, KeyError, AttributeError):
                problems.append("release metadata cannot be parsed")

    return problems


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: verify-source-archive.py <archive.zip>", file=sys.stderr)
        return 2
    problems = verify_archive(sys.argv[1])
    if problems:
        print("Source archive verification failed:")
        for problem in sorted(set(problems)):
            print(f"- {problem}")
        return 1
    print("Source archive verification passed (ZIP integrity, paths, environment files, and credential patterns).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
