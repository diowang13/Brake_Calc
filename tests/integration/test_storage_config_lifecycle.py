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


def test_storage_config_lifecycle(tmp_path: Path) -> None:
    database_path = tmp_path / "storage.sqlite3"
    initialize_database(database_path)
    connection = connect_sqlite(database_path)

    project_repository = ProjectRepository(connection)
    input_config_repository = InputConfigRepository(connection)
    calculation_run_repository = CalculationRunRepository(connection)
    email_delivery_repository = EmailDeliveryRepository(connection)

    project = project_repository.create(
        project_name="Shanghai Metro",
        project_code="SHM-001",
        email="ops@example.com",
        note="storage lifecycle",
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
    calculation_run = calculation_run_repository.create(
        project_id=project.id,
        input_config_id=input_config.id,
        triggered_by="web_ui",
        created_at="2026-04-25T10:10:00Z",
    )
    calculation_run_repository.mark_running(
        calculation_run_id=calculation_run.id,
        started_at="2026-04-25T10:11:00Z",
    )
    succeeded_run = calculation_run_repository.mark_succeeded(
        calculation_run_id=calculation_run.id,
        report={
            "controller_pressure_standards": {"AW0": {"FSB": {"bogie_1": 123}}},
            "calibration_summary": {"service_brake": {"BCP0": 25}},
            "parking_brake_check_result": {"passed": True},
            "parking_brake_check_results_by_load_group": {"AW0": {"passed": True}},
            "auto_adjustments": [],
            "electric_brake_summary": {"enabled": False},
            "warnings": [],
            "clamp_events": [],
            "trace": ["s1", "s2"],
        },
        finished_at="2026-04-25T10:12:00Z",
        markdown_report_path=None,
    )
    delivery = email_delivery_repository.create(
        calculation_run_id=succeeded_run.id,
        recipient_email="ops@example.com",
        created_at="2026-04-25T10:13:00Z",
    )
    sent_delivery = email_delivery_repository.mark_sent(
        email_delivery_id=delivery.id,
        provider_message_id="msg-001",
        sent_at="2026-04-25T10:14:00Z",
    )

    latest_config = input_config_repository.get_latest_for_project(project.id)

    assert latest_config is not None
    assert latest_config.id == input_config.id
    assert succeeded_run.status == "succeeded"
    assert json.loads(succeeded_run.report_json or "{}")["calibration_summary"]["service_brake"][
        "BCP0"
    ] == 25
    assert sent_delivery.status == "sent"
