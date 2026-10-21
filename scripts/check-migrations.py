#!/usr/bin/env python3
"""Validate migration filenames and ordering without touching a live database."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DIRECTORY = ROOT / "database" / "migrations"
FILENAME_PATTERN = re.compile(r"^(\d{4})_[a-z0-9][a-z0-9_]*\.sql$")


def validate_migrations(directory: Path) -> tuple[list[str], list[int]]:
    problems: list[str] = []
    files = sorted(directory.glob("*.sql"))
    if not files:
        return ["no SQL migration files found"], []

    versions: list[int] = []
    for path in files:
        match = FILENAME_PATTERN.fullmatch(path.name)
        if not match:
            problems.append(f"invalid migration filename: {path.name}")
            continue
        versions.append(int(match.group(1)))
        try:
            content = path.read_text(encoding="utf-8").strip()
        except (OSError, UnicodeDecodeError):
            problems.append(f"migration cannot be read as UTF-8: {path.name}")
            continue
        if not content:
            problems.append(f"empty migration file: {path.name}")

    if len(versions) != len(set(versions)):
        problems.append("duplicate migration version numbers found")
    if versions:
        expected = list(range(1, max(versions) + 1))
        if sorted(versions) != expected:
            missing = sorted(set(expected) - set(versions))
            extra = sorted(set(versions) - set(expected))
            if missing:
                problems.append("migration sequence has gaps: " + ", ".join(f"{value:04d}" for value in missing))
            if extra:
                problems.append("migration sequence contains unexpected versions")
    return problems, sorted(versions)


def main() -> int:
    if len(sys.argv) > 2:
        print("Usage: check-migrations.py [migration-directory]", file=sys.stderr)
        return 2
    directory = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else DEFAULT_DIRECTORY
    problems, versions = validate_migrations(directory)
    if problems:
        print("Migration sequence check failed:")
        for problem in problems:
            print("- " + problem)
        return 1
    print(f"Migration sequence check passed: {len(versions)} files, 0001 through {max(versions):04d}.")
    print("This checks source ordering only; it does not verify a live database's applied versions, grants, or RLS state.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
