from __future__ import annotations

import json
from pathlib import Path

from brake_calc.storage.db import connect_sqlite
from brake_calc.storage.migrations import initialize_database
from brake_calc.storage.repositories import (
    CalculationRunRepository,
    EmailDeliveryRepository,
    InputConfigRepository,
    ProjectRepository,
)


def make_repositories(
    database_path: Path,
) -> tuple[str, CalculationRunRepository, EmailDeliveryRepository]:
    initialize_database(database_path)
    connection = connect_sqlite(database_path)
    project_repository = ProjectRepository(connection)
    input_config_repository = InputConfigRepository(connection)
    run_repository = CalculationRunRepository(connection)
    email_repository = EmailDeliveryRepository(connection)
    project = project_repository.create(
        project_name="Line 1",
        project_code="LINE-001",
        email="ops@example.com",
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
    run = run_repository.create(
        project_id=project.id,
        input_config_id=input_config.id,
        triggered_by="web_ui",
        created_at="2026-04-25T10:10:00Z",
    )
    return run.id, run_repository, email_repository


def test_email_delivery_repository_tracks_pending_status(tmp_path: Path) -> None:
    run_id, _, repository = make_repositories(tmp_path / "storage.sqlite3")

    delivery = repository.create(
        calculation_run_id=run_id,
        recipient_email="ops@example.com",
        created_at="2026-04-25T10:20:00Z",
    )

    assert delivery.status == "pending"


def test_email_delivery_repository_marks_sent(tmp_path: Path) -> None:
    run_id, _, repository = make_repositories(tmp_path / "storage.sqlite3")
    delivery = repository.create(
        calculation_run_id=run_id,
        recipient_email="ops@example.com",
        created_at="2026-04-25T10:20:00Z",
    )

    sent = repository.mark_sent(
        email_delivery_id=delivery.id,
        provider_message_id="msg-001",
        sent_at="2026-04-25T10:21:00Z",
    )

    assert sent.status == "sent"
    assert sent.provider_message_id == "msg-001"
    assert sent.sent_at == "2026-04-25T10:21:00Z"


def test_email_delivery_repository_marks_failed(tmp_path: Path) -> None:
    run_id, _, repository = make_repositories(tmp_path / "storage.sqlite3")
    delivery = repository.create(
        calculation_run_id=run_id,
        recipient_email="ops@example.com",
        created_at="2026-04-25T10:20:00Z",
    )

    failed = repository.mark_failed(
        email_delivery_id=delivery.id,
        error={"type": "smtp_error", "message": "timeout"},
    )

    assert failed.status == "failed"
    assert failed.error_json == json.dumps(
        {"type": "smtp_error", "message": "timeout"},
        ensure_ascii=True,
        sort_keys=True,
    )


def test_email_delivery_repository_marks_skipped(tmp_path: Path) -> None:
    run_id, _, repository = make_repositories(tmp_path / "storage.sqlite3")
    delivery = repository.create(
        calculation_run_id=run_id,
        recipient_email="ops@example.com",
        created_at="2026-04-25T10:20:00Z",
    )

    skipped = repository.mark_skipped(
        email_delivery_id=delivery.id,
        error={"type": "missing_email", "message": "no recipient"},
    )

    assert skipped.status == "skipped"
    assert skipped.error_json == json.dumps(
        {"type": "missing_email", "message": "no recipient"},
        ensure_ascii=True,
        sort_keys=True,
    )
