from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProjectRecord:
    id: str
    project_name: str
    project_code: str
    email: str | None
    note: str
    is_archived: bool
    archived_at: str | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class InputConfigRecord:
    id: str
    project_id: str
    version: int
    schema_version: int
    yaml_text: str
    form_state_json: str
    yaml_sha256: str
    validation_status: str
    validation_errors_json: str
    source: str
    created_at: str
    exported_filename: str | None


@dataclass(frozen=True)
class CalculationRunRecord:
    id: str
    project_id: str
    input_config_id: str
    status: str
    started_at: str | None
    finished_at: str | None
    triggered_by: str
    hermes_session_id: str | None
    report_json: str | None
    markdown_report_path: str | None
    error_json: str | None
    created_at: str


@dataclass(frozen=True)
class EmailDeliveryRecord:
    id: str
    calculation_run_id: str
    recipient_email: str
    status: str
    provider_message_id: str | None
    error_json: str | None
    sent_at: str | None
    created_at: str
