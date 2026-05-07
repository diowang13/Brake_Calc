from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid

from brake_calc.storage.models import (
    CalculationRunRecord,
    EmailDeliveryRecord,
    InputConfigRecord,
    ProjectRecord,
)


def _dump_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=True, sort_keys=True)


def yaml_sha256(yaml_text: str) -> str:
    return hashlib.sha256(yaml_text.encode("utf-8")).hexdigest()


def _as_int(value: object) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        return int(value)
    raise TypeError(f"Expected int-like SQLite value, got {type(value)!r}")


def _row_to_project(row: tuple[object, ...] | None) -> ProjectRecord | None:
    if row is None:
        return None
    return ProjectRecord(
        id=str(row[0]),
        project_name=str(row[1]),
        project_code=str(row[2]),
        email=None if row[3] is None else str(row[3]),
        note=str(row[4]),
        is_archived=bool(row[5]),
        archived_at=None if row[6] is None else str(row[6]),
        created_at=str(row[7]),
        updated_at=str(row[8]),
    )


def _row_to_input_config(row: tuple[object, ...] | None) -> InputConfigRecord | None:
    if row is None:
        return None
    return InputConfigRecord(
        id=str(row[0]),
        project_id=str(row[1]),
        version=_as_int(row[2]),
        schema_version=_as_int(row[3]),
        yaml_text=str(row[4]),
        form_state_json=str(row[5]),
        yaml_sha256=str(row[6]),
        validation_status=str(row[7]),
        validation_errors_json=str(row[8]),
        source=str(row[9]),
        created_at=str(row[10]),
        exported_filename=None if row[11] is None else str(row[11]),
        source_input_config_id=None if row[12] is None else str(row[12]),
        revision_reason=None if row[13] is None else str(row[13]),
    )


def _row_to_calculation_run(row: tuple[object, ...] | None) -> CalculationRunRecord | None:
    if row is None:
        return None
    return CalculationRunRecord(
        id=str(row[0]),
        project_id=str(row[1]),
        input_config_id=str(row[2]),
        status=str(row[3]),
        started_at=None if row[4] is None else str(row[4]),
        finished_at=None if row[5] is None else str(row[5]),
        triggered_by=str(row[6]),
        hermes_session_id=None if row[7] is None else str(row[7]),
        report_json=None if row[8] is None else str(row[8]),
        markdown_report_path=None if row[9] is None else str(row[9]),
        error_json=None if row[10] is None else str(row[10]),
        created_at=str(row[11]),
    )


def _row_to_email_delivery(row: tuple[object, ...] | None) -> EmailDeliveryRecord | None:
    if row is None:
        return None
    return EmailDeliveryRecord(
        id=str(row[0]),
        calculation_run_id=str(row[1]),
        recipient_email=str(row[2]),
        status=str(row[3]),
        provider_message_id=None if row[4] is None else str(row[4]),
        error_json=None if row[5] is None else str(row[5]),
        sent_at=None if row[6] is None else str(row[6]),
        created_at=str(row[7]),
    )


class ProjectRepository:
    """封装 projects 表的最小读写操作。"""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def create(
        self,
        *,
        project_name: str,
        project_code: str,
        email: str | None,
        note: str,
        created_at: str,
    ) -> ProjectRecord:
        project_id = str(uuid.uuid4())
        self._connection.execute(
            """
            INSERT INTO projects (
                id, project_name, project_code, email, note,
                is_archived, archived_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                project_name,
                project_code,
                email,
                note,
                0,
                None,
                created_at,
                created_at,
            ),
        )
        self._connection.commit()
        project = self.get(project_id)
        assert project is not None
        return project

    def get(self, project_id: str) -> ProjectRecord | None:
        row = self._connection.execute(
            """
            SELECT
                id, project_name, project_code, email, note,
                is_archived, archived_at, created_at, updated_at
            FROM projects
            WHERE id = ?
            """,
            (project_id,),
        ).fetchone()
        return _row_to_project(row)

    def get_by_project_code(self, project_code: str) -> ProjectRecord | None:
        row = self._connection.execute(
            """
            SELECT
                id, project_name, project_code, email, note,
                is_archived, archived_at, created_at, updated_at
            FROM projects
            WHERE project_code = ?
            """,
            (project_code,),
        ).fetchone()
        return _row_to_project(row)

    def update(
        self,
        *,
        project_id: str,
        project_name: str,
        email: str | None,
        note: str,
        updated_at: str,
    ) -> ProjectRecord:
        self._connection.execute(
            """
            UPDATE projects
            SET project_name = ?, email = ?, note = ?, updated_at = ?
            WHERE id = ?
            """,
            (project_name, email, note, updated_at, project_id),
        )
        self._connection.commit()
        project = self.get(project_id)
        assert project is not None
        return project

    def archive(self, *, project_id: str, archived_at: str) -> ProjectRecord:
        self._connection.execute(
            """
            UPDATE projects
            SET is_archived = ?, archived_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (1, archived_at, archived_at, project_id),
        )
        self._connection.commit()
        project = self.get(project_id)
        assert project is not None
        return project

    def list_all(self) -> list[ProjectRecord]:
        rows = self._connection.execute(
            """
            SELECT
                id, project_name, project_code, email, note,
                is_archived, archived_at, created_at, updated_at
            FROM projects
            WHERE is_archived = 0
            ORDER BY updated_at DESC
            """
        ).fetchall()
        return [item for item in (_row_to_project(row) for row in rows) if item is not None]


class InputConfigRepository:
    """封装 input_configs 表的最小读写操作。"""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def create(
        self,
        *,
        project_id: str,
        schema_version: int,
        yaml_text: str,
        form_state: object,
        validation_status: str,
        validation_errors: object,
        source: str,
        created_at: str,
        exported_filename: str | None = None,
        source_input_config_id: str | None = None,
        revision_reason: str | None = None,
    ) -> InputConfigRecord:
        input_config_id = str(uuid.uuid4())
        current_version = self._connection.execute(
            "SELECT COALESCE(MAX(version), 0) FROM input_configs WHERE project_id = ?",
            (project_id,),
        ).fetchone()
        assert current_version is not None
        version = _as_int(current_version[0]) + 1
        self._connection.execute(
            """
            INSERT INTO input_configs (
                id, project_id, version, schema_version, yaml_text,
                form_state_json, yaml_sha256, validation_status,
                validation_errors_json, source, created_at, exported_filename,
                source_input_config_id, revision_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                input_config_id,
                project_id,
                version,
                schema_version,
                yaml_text,
                _dump_json(form_state),
                yaml_sha256(yaml_text),
                validation_status,
                _dump_json(validation_errors),
                source,
                created_at,
                exported_filename,
                source_input_config_id,
                revision_reason,
            ),
        )
        self._connection.commit()
        input_config = self.get(input_config_id)
        assert input_config is not None
        return input_config

    def get(self, input_config_id: str) -> InputConfigRecord | None:
        row = self._connection.execute(
            """
            SELECT
                id, project_id, version, schema_version, yaml_text,
                form_state_json, yaml_sha256, validation_status,
                validation_errors_json, source, created_at, exported_filename,
                source_input_config_id, revision_reason
            FROM input_configs
            WHERE id = ?
            """,
            (input_config_id,),
        ).fetchone()
        return _row_to_input_config(row)

    def get_latest_for_project(self, project_id: str) -> InputConfigRecord | None:
        row = self._connection.execute(
            """
            SELECT
                id, project_id, version, schema_version, yaml_text,
                form_state_json, yaml_sha256, validation_status,
                validation_errors_json, source, created_at, exported_filename,
                source_input_config_id, revision_reason
            FROM input_configs
            WHERE project_id = ?
            ORDER BY version DESC
            LIMIT 1
            """,
            (project_id,),
        ).fetchone()
        return _row_to_input_config(row)

    def list_for_project(self, project_id: str) -> list[InputConfigRecord]:
        rows = self._connection.execute(
            """
            SELECT
                id, project_id, version, schema_version, yaml_text,
                form_state_json, yaml_sha256, validation_status,
                validation_errors_json, source, created_at, exported_filename,
                source_input_config_id, revision_reason
            FROM input_configs
            WHERE project_id = ?
            ORDER BY version DESC
            """,
            (project_id,),
        ).fetchall()
        return [item for item in (_row_to_input_config(row) for row in rows) if item is not None]

    def update_validation(
        self,
        *,
        input_config_id: str,
        validation_status: str,
        validation_errors: object,
    ) -> InputConfigRecord:
        self._connection.execute(
            """
            UPDATE input_configs
            SET validation_status = ?, validation_errors_json = ?
            WHERE id = ?
            """,
            (validation_status, _dump_json(validation_errors), input_config_id),
        )
        self._connection.commit()
        input_config = self.get(input_config_id)
        assert input_config is not None
        return input_config


class CalculationRunRepository:
    """封装 calculation_runs 表的最小读写操作。"""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def create(
        self,
        *,
        project_id: str,
        input_config_id: str,
        triggered_by: str,
        created_at: str,
        hermes_session_id: str | None = None,
    ) -> CalculationRunRecord:
        calculation_run_id = str(uuid.uuid4())
        self._connection.execute(
            """
            INSERT INTO calculation_runs (
                id, project_id, input_config_id, status, started_at,
                finished_at, triggered_by, hermes_session_id, report_json,
                markdown_report_path, error_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                calculation_run_id,
                project_id,
                input_config_id,
                "queued",
                None,
                None,
                triggered_by,
                hermes_session_id,
                None,
                None,
                None,
                created_at,
            ),
        )
        self._connection.commit()
        calculation_run = self.get(calculation_run_id)
        assert calculation_run is not None
        return calculation_run

    def get(self, calculation_run_id: str) -> CalculationRunRecord | None:
        row = self._connection.execute(
            """
            SELECT
                id, project_id, input_config_id, status, started_at,
                finished_at, triggered_by, hermes_session_id, report_json,
                markdown_report_path, error_json, created_at
            FROM calculation_runs
            WHERE id = ?
            """,
            (calculation_run_id,),
        ).fetchone()
        return _row_to_calculation_run(row)

    def get_latest_for_input_config(self, input_config_id: str) -> CalculationRunRecord | None:
        row = self._connection.execute(
            """
            SELECT
                id, project_id, input_config_id, status, started_at,
                finished_at, triggered_by, hermes_session_id, report_json,
                markdown_report_path, error_json, created_at
            FROM calculation_runs
            WHERE input_config_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (input_config_id,),
        ).fetchone()
        return _row_to_calculation_run(row)

    def mark_running(self, *, calculation_run_id: str, started_at: str) -> CalculationRunRecord:
        self._connection.execute(
            """
            UPDATE calculation_runs
            SET status = ?, started_at = ?
            WHERE id = ?
            """,
            ("running", started_at, calculation_run_id),
        )
        self._connection.commit()
        calculation_run = self.get(calculation_run_id)
        assert calculation_run is not None
        return calculation_run

    def mark_succeeded(
        self,
        *,
        calculation_run_id: str,
        report: object,
        finished_at: str,
        markdown_report_path: str | None,
    ) -> CalculationRunRecord:
        self._connection.execute(
            """
            UPDATE calculation_runs
            SET status = ?, finished_at = ?, report_json = ?,
                markdown_report_path = ?, error_json = ?
            WHERE id = ?
            """,
            (
                "succeeded",
                finished_at,
                _dump_json(report),
                markdown_report_path,
                None,
                calculation_run_id,
            ),
        )
        self._connection.commit()
        calculation_run = self.get(calculation_run_id)
        assert calculation_run is not None
        return calculation_run

    def mark_failed(
        self,
        *,
        calculation_run_id: str,
        error: object,
        finished_at: str,
    ) -> CalculationRunRecord:
        self._connection.execute(
            """
            UPDATE calculation_runs
            SET status = ?, finished_at = ?, error_json = ?
            WHERE id = ?
            """,
            ("failed", finished_at, _dump_json(error), calculation_run_id),
        )
        self._connection.commit()
        calculation_run = self.get(calculation_run_id)
        assert calculation_run is not None
        return calculation_run


class EmailDeliveryRepository:
    """封装 email_deliveries 表的最小读写操作。"""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def create(
        self,
        *,
        calculation_run_id: str,
        recipient_email: str,
        created_at: str,
    ) -> EmailDeliveryRecord:
        email_delivery_id = str(uuid.uuid4())
        self._connection.execute(
            """
            INSERT INTO email_deliveries (
                id, calculation_run_id, recipient_email, status,
                provider_message_id, error_json, sent_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                email_delivery_id,
                calculation_run_id,
                recipient_email,
                "pending",
                None,
                None,
                None,
                created_at,
            ),
        )
        self._connection.commit()
        email_delivery = self.get(email_delivery_id)
        assert email_delivery is not None
        return email_delivery

    def get(self, email_delivery_id: str) -> EmailDeliveryRecord | None:
        row = self._connection.execute(
            """
            SELECT
                id, calculation_run_id, recipient_email, status,
                provider_message_id, error_json, sent_at, created_at
            FROM email_deliveries
            WHERE id = ?
            """,
            (email_delivery_id,),
        ).fetchone()
        return _row_to_email_delivery(row)

    def mark_sent(
        self,
        *,
        email_delivery_id: str,
        provider_message_id: str,
        sent_at: str,
    ) -> EmailDeliveryRecord:
        self._connection.execute(
            """
            UPDATE email_deliveries
            SET status = ?, provider_message_id = ?, sent_at = ?, error_json = ?
            WHERE id = ?
            """,
            ("sent", provider_message_id, sent_at, None, email_delivery_id),
        )
        self._connection.commit()
        email_delivery = self.get(email_delivery_id)
        assert email_delivery is not None
        return email_delivery

    def mark_failed(self, *, email_delivery_id: str, error: object) -> EmailDeliveryRecord:
        self._connection.execute(
            """
            UPDATE email_deliveries
            SET status = ?, error_json = ?
            WHERE id = ?
            """,
            ("failed", _dump_json(error), email_delivery_id),
        )
        self._connection.commit()
        email_delivery = self.get(email_delivery_id)
        assert email_delivery is not None
        return email_delivery

    def mark_skipped(self, *, email_delivery_id: str, error: object) -> EmailDeliveryRecord:
        self._connection.execute(
            """
            UPDATE email_deliveries
            SET status = ?, error_json = ?
            WHERE id = ?
            """,
            ("skipped", _dump_json(error), email_delivery_id),
        )
        self._connection.commit()
        email_delivery = self.get(email_delivery_id)
        assert email_delivery is not None
        return email_delivery
