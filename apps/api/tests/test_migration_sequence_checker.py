from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
CHECKER = ROOT / "scripts" / "check-migrations.py"


def make_migrations(directory: Path, names):
    directory.mkdir()
    for name in names:
        (directory / name).write_text("-- migration\nselect 1;\n", encoding="utf-8")
    return directory


def run_checker(directory):
    return subprocess.run(
        [sys.executable, str(CHECKER), str(directory)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def test_repository_migration_sequence_is_contiguous():
    result = subprocess.run(
        [sys.executable, str(CHECKER)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "33 files, 0001 through 0033" in result.stdout
    assert "does not verify a live database" in result.stdout


def test_migration_checker_rejects_gaps(tmp_path):
    directory = make_migrations(tmp_path / "migrations", ["0001_first.sql", "0003_third.sql"])
    result = run_checker(directory)
    assert result.returncode == 1
    assert "migration sequence has gaps: 0002" in result.stdout


def test_migration_checker_rejects_duplicate_version_numbers(tmp_path):
    directory = make_migrations(tmp_path / "migrations", ["0001_first.sql", "0001_second.sql"])
    result = run_checker(directory)
    assert result.returncode == 1
    assert "duplicate migration version numbers" in result.stdout


def test_migration_checker_rejects_invalid_names_and_empty_files(tmp_path):
    directory = tmp_path / "migrations"
    directory.mkdir()
    (directory / "001a_invalid.sql").write_text("-- invalid name", encoding="utf-8")
    (directory / "0001_empty.sql").write_text("  ", encoding="utf-8")
    result = run_checker(directory)
    assert result.returncode == 1
    assert "invalid migration filename" in result.stdout
    assert "empty migration file" in result.stdout
