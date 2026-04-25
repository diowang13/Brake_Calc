from __future__ import annotations

import json
from pathlib import Path

from brake_calc.storage.db import connect_sqlite
from brake_calc.storage.migrations import initialize_database
from brake_calc.storage.repositories import InputConfigRepository, ProjectRepository, yaml_sha256


def make_repositories(database_path: Path) -> tuple[ProjectRepository, InputConfigRepository]:
    initialize_database(database_path)
    connection = connect_sqlite(database_path)
    return ProjectRepository(connection), InputConfigRepository(connection)


def test_input_config_repository_increments_version_per_project(tmp_path: Path) -> None:
    project_repository, repository = make_repositories(tmp_path / "storage.sqlite3")
    project = project_repository.create(
        project_name="Line 1",
        project_code="LINE-001",
        email=None,
        note="",
        created_at="2026-04-25T10:00:00Z",
    )

    first = repository.create(
        project_id=project.id,
        schema_version=1,
        yaml_text="schema_version: 1\nv0: 80\n",
        form_state={"schema_version": 1, "v0": 80},
        validation_status="not_validated",
        validation_errors=[],
        source="manual_save",
        created_at="2026-04-25T10:05:00Z",
    )
    second = repository.create(
        project_id=project.id,
        schema_version=1,
        yaml_text="schema_version: 1\nv0: 90\n",
        form_state={"schema_version": 1, "v0": 90},
        validation_status="not_validated",
        validation_errors=[],
        source="manual_save",
        created_at="2026-04-25T10:10:00Z",
    )

    assert first.version == 1
    assert second.version == 2


def test_input_config_repository_returns_latest_config_for_project(tmp_path: Path) -> None:
    project_repository, repository = make_repositories(tmp_path / "storage.sqlite3")
    project = project_repository.create(
        project_name="Line 1",
        project_code="LINE-001",
        email=None,
        note="",
        created_at="2026-04-25T10:00:00Z",
    )
    repository.create(
        project_id=project.id,
        schema_version=1,
        yaml_text="schema_version: 1\nv0: 80\n",
        form_state={"schema_version": 1, "v0": 80},
        validation_status="not_validated",
        validation_errors=[],
        source="manual_save",
        created_at="2026-04-25T10:05:00Z",
    )
    latest = repository.create(
        project_id=project.id,
        schema_version=1,
        yaml_text="schema_version: 1\nv0: 90\n",
        form_state={"schema_version": 1, "v0": 90},
        validation_status="not_validated",
        validation_errors=[],
        source="manual_save",
        created_at="2026-04-25T10:10:00Z",
    )

    loaded = repository.get_latest_for_project(project.id)

    assert loaded == latest


def test_input_config_repository_persists_validation_result(tmp_path: Path) -> None:
    project_repository, repository = make_repositories(tmp_path / "storage.sqlite3")
    project = project_repository.create(
        project_name="Line 1",
        project_code="LINE-001",
        email=None,
        note="",
        created_at="2026-04-25T10:00:00Z",
    )
    created = repository.create(
        project_id=project.id,
        schema_version=1,
        yaml_text="schema_version: 1\nv0: 90\n",
        form_state={"schema_version": 1, "v0": 90},
        validation_status="not_validated",
        validation_errors=[],
        source="manual_save",
        created_at="2026-04-25T10:10:00Z",
    )

    updated = repository.update_validation(
        input_config_id=created.id,
        validation_status="invalid",
        validation_errors=[{"path": "v0", "message": "must be positive"}],
    )

    assert updated.validation_status == "invalid"
    assert updated.validation_errors_json == json.dumps(
        [{"path": "v0", "message": "must be positive"}],
        ensure_ascii=True,
        sort_keys=True,
    )


def test_yaml_sha256_is_stable_for_same_text() -> None:
    yaml_text = "schema_version: 1\nv0: 80\n"

    assert yaml_sha256(yaml_text) == yaml_sha256(yaml_text)
