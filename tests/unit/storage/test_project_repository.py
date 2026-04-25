from __future__ import annotations

from pathlib import Path

from brake_calc.storage.db import connect_sqlite
from brake_calc.storage.migrations import initialize_database
from brake_calc.storage.repositories import ProjectRepository


def make_repository(database_path: Path) -> ProjectRepository:
    initialize_database(database_path)
    connection = connect_sqlite(database_path)
    return ProjectRepository(connection)


def test_project_repository_create_and_get_by_id(tmp_path: Path) -> None:
    repository = make_repository(tmp_path / "storage.sqlite3")

    created = repository.create(
        project_name="Shanghai Metro",
        project_code="SHM-001",
        email="ops@example.com",
        note="v1 storage",
        created_at="2026-04-25T10:00:00Z",
    )

    loaded = repository.get(created.id)

    assert loaded == created


def test_project_repository_get_by_project_code(tmp_path: Path) -> None:
    repository = make_repository(tmp_path / "storage.sqlite3")
    created = repository.create(
        project_name="Line 1",
        project_code="LINE-001",
        email=None,
        note="",
        created_at="2026-04-25T10:00:00Z",
    )

    loaded = repository.get_by_project_code("LINE-001")

    assert loaded == created


def test_project_repository_update_mutates_metadata_and_timestamp(tmp_path: Path) -> None:
    repository = make_repository(tmp_path / "storage.sqlite3")
    created = repository.create(
        project_name="Line 1",
        project_code="LINE-001",
        email=None,
        note="draft",
        created_at="2026-04-25T10:00:00Z",
    )

    updated = repository.update(
        project_id=created.id,
        project_name="Line 1 Updated",
        email="owner@example.com",
        note="approved",
        updated_at="2026-04-25T11:00:00Z",
    )

    assert updated.project_name == "Line 1 Updated"
    assert updated.email == "owner@example.com"
    assert updated.note == "approved"
    assert updated.updated_at == "2026-04-25T11:00:00Z"
    assert updated.created_at == created.created_at


def test_project_repository_archive_marks_project_archived(tmp_path: Path) -> None:
    repository = make_repository(tmp_path / "storage.sqlite3")
    created = repository.create(
        project_name="Line 1",
        project_code="LINE-001",
        email=None,
        note="draft",
        created_at="2026-04-25T10:00:00Z",
    )

    archived = repository.archive(
        project_id=created.id,
        archived_at="2026-04-25T12:00:00Z",
    )

    assert archived.is_archived is True
    assert archived.archived_at == "2026-04-25T12:00:00Z"
