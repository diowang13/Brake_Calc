from __future__ import annotations

import json
from pathlib import Path

from brake_calc.storage.db import connect_sqlite
from brake_calc.storage.migrations import initialize_database
from brake_calc.storage.repositories import (
    CalculationRunRepository,
    InputConfigRepository,
    ProjectRepository,
)


def make_repositories(
    database_path: Path,
) -> tuple[ProjectRepository, InputConfigRepository, CalculationRunRepository]:
    initialize_database(database_path)
    connection = connect_sqlite(database_path)
    return (
        ProjectRepository(connection),
        InputConfigRepository(connection),
        CalculationRunRepository(connection),
    )


def create_input_config(database_path: Path) -> tuple[str, str, CalculationRunRepository]:
    project_repository, input_config_repository, run_repository = make_repositories(database_path)
    project = project_repository.create(
        project_name="Line 1",
        project_code="LINE-001",
        email=None,
        note="",
        created_at="2026-04-25T10:00:00Z",
    )
    input_config = input_config_repository.create(
        project_id=project.id,
        schema_version=1,
        yaml_text="schema_version: 1\nv0: 80\n",
        form_state={"schema_version": 1, "v0": 80},
        validation_status="valid",
        validation_errors=[],
        source="manual_save",
        created_at="2026-04-25T10:05:00Z",
    )
    return project.id, input_config.id, run_repository


def make_report_payload() -> dict[str, object]:
    return {
        "controller_pressure_standards": {"AW0": {"FSB": {"bogie_1": 123}}},
        "calibration_summary": {"service_brake": {"BCP0": 25}},
        "parking_brake_check_result": {"passed": True},
        "parking_brake_check_results_by_load_group": {"AW0": {"passed": True}},
        "auto_adjustments": [{"type": "adhesion_fallback"}],
        "electric_brake_summary": {"enabled": False},
        "warnings": ["note"],
        "clamp_events": [],
        "trace": ["s1", "s2"],
    }


def test_calculation_run_repository_tracks_queued_and_running_status(tmp_path: Path) -> None:
    project_id, input_config_id, repository = create_input_config(tmp_path / "storage.sqlite3")

    queued = repository.create(
        project_id=project_id,
        input_config_id=input_config_id,
        triggered_by="web_ui",
        created_at="2026-04-25T10:10:00Z",
    )
    running = repository.mark_running(
        calculation_run_id=queued.id,
        started_at="2026-04-25T10:11:00Z",
    )

    assert queued.status == "queued"
    assert running.status == "running"
    assert running.started_at == "2026-04-25T10:11:00Z"


def test_calculation_run_repository_persists_succeeded_report(tmp_path: Path) -> None:
    project_id, input_config_id, repository = create_input_config(tmp_path / "storage.sqlite3")
    queued = repository.create(
        project_id=project_id,
        input_config_id=input_config_id,
        triggered_by="web_ui",
        created_at="2026-04-25T10:10:00Z",
    )
    repository.mark_running(
        calculation_run_id=queued.id,
        started_at="2026-04-25T10:11:00Z",
    )

    succeeded = repository.mark_succeeded(
        calculation_run_id=queued.id,
        report=make_report_payload(),
        finished_at="2026-04-25T10:12:00Z",
        markdown_report_path="out/report.md",
    )

    assert succeeded.status == "succeeded"
    assert succeeded.markdown_report_path == "out/report.md"
    assert succeeded.report_json == json.dumps(
        make_report_payload(),
        ensure_ascii=True,
        sort_keys=True,
    )


def test_calculation_run_repository_persists_failed_error(tmp_path: Path) -> None:
    project_id, input_config_id, repository = create_input_config(tmp_path / "storage.sqlite3")
    queued = repository.create(
        project_id=project_id,
        input_config_id=input_config_id,
        triggered_by="hermes",
        created_at="2026-04-25T10:10:00Z",
    )

    failed = repository.mark_failed(
        calculation_run_id=queued.id,
        error={"type": "validation_error", "message": "invalid input"},
        finished_at="2026-04-25T10:12:00Z",
    )

    assert failed.status == "failed"
    assert failed.error_json == json.dumps(
        {"type": "validation_error", "message": "invalid input"},
        ensure_ascii=True,
        sort_keys=True,
    )


def test_calculation_run_repository_gets_latest_run_for_input_config(tmp_path: Path) -> None:
    project_id, input_config_id, repository = create_input_config(tmp_path / "storage.sqlite3")
    first = repository.create(
        project_id=project_id,
        input_config_id=input_config_id,
        triggered_by="web_ui",
        created_at="2026-04-25T10:10:00Z",
    )
    repository.mark_failed(
        calculation_run_id=first.id,
        error={"type": "runtime_error", "message": "failed"},
        finished_at="2026-04-25T10:11:00Z",
    )
    second = repository.create(
        project_id=project_id,
        input_config_id=input_config_id,
        triggered_by="web_ui",
        created_at="2026-04-25T10:12:00Z",
    )
    repository.mark_succeeded(
        calculation_run_id=second.id,
        report=make_report_payload(),
        finished_at="2026-04-25T10:13:00Z",
        markdown_report_path=None,
    )

    latest = repository.get_latest_for_input_config(input_config_id)
    assert latest is not None
    assert latest.id == second.id
    assert latest.status == "succeeded"
