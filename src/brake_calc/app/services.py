from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Callable, Protocol

import yaml
from pydantic import ValidationError

from brake_calc.app.schemas import (
    CalculationRunResult,
    LoadConfigResult,
    OpenProjectResult,
    ProjectPayload,
    SaveConfigRequest,
    SaveConfigResult,
    ValidationErrorItem,
    ValidationResult,
    YamlImportResult,
)
from brake_calc.contracts.inputs import Inputs
from brake_calc.contracts.report import Report


class ProjectRepositoryProtocol(Protocol):
    def get_by_project_code(self, project_code: str) -> "ProjectRecordProtocol | None": ...
    def create(
        self,
        *,
        project_name: str,
        project_code: str,
        email: str | None,
        note: str,
        created_at: str,
    ) -> "ProjectRecordProtocol": ...
    def update(
        self,
        *,
        project_id: str,
        project_name: str,
        email: str | None,
        note: str,
        updated_at: str,
    ) -> "ProjectRecordProtocol": ...
    def get(self, project_id: str) -> "ProjectRecordProtocol | None": ...


class InputConfigRepositoryProtocol(Protocol):
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
    ) -> "InputConfigRecordProtocol": ...
    def get(self, input_config_id: str) -> "InputConfigRecordProtocol | None": ...
    def get_latest_for_project(self, project_id: str) -> "InputConfigRecordProtocol | None": ...


class ProjectRecordProtocol(Protocol):
    id: str
    project_name: str
    project_code: str
    email: str | None
    note: str


class InputConfigRecordProtocol(Protocol):
    id: str
    project_id: str
    version: int
    yaml_text: str
    form_state_json: str
    validation_status: str
    validation_errors_json: str
    source_input_config_id: str | None
    revision_reason: str | None


class CalculationRunRepositoryProtocol(Protocol):
    def create(
        self,
        *,
        project_id: str,
        input_config_id: str,
        triggered_by: str,
        created_at: str,
        hermes_session_id: str | None = None,
    ) -> "CalculationRunRecordProtocol": ...
    def mark_running(
        self,
        *,
        calculation_run_id: str,
        started_at: str,
    ) -> "CalculationRunRecordProtocol": ...
    def mark_succeeded(
        self,
        *,
        calculation_run_id: str,
        report: object,
        finished_at: str,
        markdown_report_path: str | None,
    ) -> "CalculationRunRecordProtocol": ...
    def mark_failed(
        self,
        *,
        calculation_run_id: str,
        error: object,
        finished_at: str,
    ) -> "CalculationRunRecordProtocol": ...


class CalculationRunRecordProtocol(Protocol):
    id: str
    status: str
    report_json: str | None


def _normalize_path(location: tuple[object, ...] | list[object] | object) -> str:
    if isinstance(location, (tuple, list)):
        return ".".join(str(item) for item in location)
    return str(location)


def _parse_validation_error(error: ValidationError) -> list[ValidationErrorItem]:
    return [
        ValidationErrorItem(
            path=_normalize_path(item["loc"]),
            message=str(item["msg"]),
        )
        for item in error.errors()
    ]


def _load_json_object(raw: str) -> dict[str, object]:
    loaded = json.loads(raw)
    if not isinstance(loaded, dict):
        raise TypeError("Expected JSON object")
    return loaded


class ValidationService:
    """权威输入校验服务。"""

    def validate_yaml_text(self, yaml_text: str) -> ValidationResult:
        try:
            payload = yaml.safe_load(yaml_text)
        except yaml.YAMLError as exc:
            return ValidationResult(
                valid=False,
                errors=[ValidationErrorItem(path="yaml_text", message=str(exc))],
                normalized_inputs=None,
            )
        if not isinstance(payload, dict):
            return ValidationResult(
                valid=False,
                errors=[
                    ValidationErrorItem(
                        path="yaml_text",
                        message="YAML root must be a mapping",
                    )
                ],
                normalized_inputs=None,
            )
        return self.validate_inputs_payload(payload)

    def validate_inputs_payload(self, payload: dict[str, Any]) -> ValidationResult:
        try:
            inputs = Inputs.model_validate(payload)
        except ValidationError as exc:
            return ValidationResult(
                valid=False,
                errors=_parse_validation_error(exc),
                normalized_inputs=None,
            )
        return ValidationResult(
            valid=True,
            errors=[],
            normalized_inputs=inputs.model_dump(mode="json", exclude_none=True),
        )


class ConfigService:
    """配置保存/读取服务。"""

    def __init__(
        self,
        *,
        project_repository: ProjectRepositoryProtocol,
        input_config_repository: InputConfigRepositoryProtocol,
    ) -> None:
        self._project_repository = project_repository
        self._input_config_repository = input_config_repository

    def save_config(self, request: SaveConfigRequest) -> SaveConfigResult:
        project = self._project_repository.get_by_project_code(request.project.project_code)
        if project is None:
            project = self._project_repository.create(
                project_name=request.project.project_name,
                project_code=request.project.project_code,
                email=request.project.email,
                note=request.project.note,
                created_at=request.created_at,
            )
        else:
            project = self._project_repository.update(
                project_id=project.id,
                project_name=request.project.project_name,
                email=request.project.email,
                note=request.project.note,
                updated_at=request.created_at,
            )

        schema_version = request.form_state.get("schema_version", 1)
        if not isinstance(schema_version, int):
            schema_version = 1

        input_config = self._input_config_repository.create(
            project_id=project.id,
            schema_version=schema_version,
            yaml_text=request.yaml_text,
            form_state=request.form_state,
            validation_status=request.validation_status,
            validation_errors=[error.__dict__ for error in request.errors],
            source="manual_save",
            created_at=request.created_at,
            source_input_config_id=request.source_input_config_id,
            revision_reason=request.revision_reason,
        )
        return SaveConfigResult(
            project_id=project.id,
            input_config_id=input_config.id,
            version=input_config.version,
            validation_status=input_config.validation_status,
            errors=request.errors,
        )

    def load_config(self, input_config_id: str) -> LoadConfigResult:
        input_config = self._input_config_repository.get(input_config_id)
        assert input_config is not None
        project = self._project_repository.get(input_config.project_id)
        assert project is not None
        return LoadConfigResult(
            project=ProjectPayload(
                project_name=project.project_name,
                project_code=project.project_code,
                email=project.email,
                note=project.note,
            ),
            yaml_text=input_config.yaml_text,
            form_state=_load_json_object(input_config.form_state_json),
            validation_status=input_config.validation_status,
            errors=[
                ValidationErrorItem(
                    path=str(item["path"]),
                    message=str(item["message"]),
                )
                for item in json.loads(input_config.validation_errors_json)
            ],
            version=input_config.version,
            source_input_config_id=input_config.source_input_config_id,
            revision_reason=input_config.revision_reason,
        )

    def build_export_filename(self, *, project_code: str, created_at: str) -> str:
        timestamp = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        return f"{project_code}_input_{timestamp:%Y%m%d_%H%M}.yaml"

    def load_latest_project_config(self, project_code: str) -> OpenProjectResult:
        project = self._project_repository.get_by_project_code(project_code)
        if project is None:
            raise LookupError("project_not_found")
        latest_config = self._input_config_repository.get_latest_for_project(project.id)
        if latest_config is None:
            raise LookupError("input_config_not_found")
        loaded = self.load_config(latest_config.id)
        return OpenProjectResult(input_config_id=latest_config.id, config=loaded)

    def list_projects(self) -> list[dict[str, object]]:
        projects = self._project_repository.list_all()  # type: ignore[attr-defined]
        result: list[dict[str, object]] = []
        for project in projects:
            latest_config = self._input_config_repository.get_latest_for_project(project.id)
            controller_type: str | None = None
            if latest_config is not None:
                try:
                    form_state = _load_json_object(latest_config.form_state_json)
                    controller_raw = form_state.get("controller_type")
                    if controller_raw in ("car", "bogie"):
                        controller_type = str(controller_raw)
                except Exception:
                    controller_type = None
            result.append(
                {
                    "project_name": project.project_name,
                    "project_code": project.project_code,
                    "updated_at": project.updated_at,
                    "latest_input_config_id": None if latest_config is None else latest_config.id,
                    "controller_type": controller_type,
                }
            )
        return result


class YamlImportService:
    """YAML 导入与表单回填服务。"""

    def __init__(self, *, validation_service: ValidationService) -> None:
        self._validation_service = validation_service

    def import_yaml(self, yaml_text: str) -> YamlImportResult:
        result = self._validation_service.validate_yaml_text(yaml_text)
        return YamlImportResult(
            valid=result.valid,
            errors=result.errors,
            inputs=result.normalized_inputs,
            form_state=result.normalized_inputs,
        )


class CalculationService:
    """已保存配置的运行服务。"""

    def __init__(
        self,
        *,
        input_config_repository: InputConfigRepositoryProtocol,
        calculation_run_repository: CalculationRunRepositoryProtocol,
        validation_service: ValidationService,
        run_workflow_fn: Callable[[Inputs], Report],
        project_repository: ProjectRepositoryProtocol | None = None,
    ) -> None:
        self._input_config_repository = input_config_repository
        self._calculation_run_repository = calculation_run_repository
        self._validation_service = validation_service
        self._run_workflow_fn = run_workflow_fn
        self._project_repository = project_repository

    def run_saved_config(
        self,
        *,
        input_config_id: str,
        triggered_by: str,
        created_at: str,
        started_at: str,
        finished_at: str,
        hermes_session_id: str | None = None,
    ) -> CalculationRunResult:
        input_config = self._input_config_repository.get(input_config_id)
        if input_config is None:
            raise LookupError("input_config_not_found")
        validation = self._validation_service.validate_yaml_text(input_config.yaml_text)
        if not validation.valid or validation.normalized_inputs is None:
            error_lines = [f"{item.path}: {item.message}" for item in validation.errors]
            raise ValueError("input_config_invalid: " + "; ".join(error_lines))

        calculation_run = self._calculation_run_repository.create(
            project_id=input_config.project_id,
            input_config_id=input_config.id,
            triggered_by=triggered_by,
            created_at=created_at,
            hermes_session_id=hermes_session_id,
        )
        self._calculation_run_repository.mark_running(
            calculation_run_id=calculation_run.id,
            started_at=started_at,
        )

        try:
            report = self._run_workflow_fn(Inputs.model_validate(validation.normalized_inputs))
        except Exception as exc:
            failed = self._calculation_run_repository.mark_failed(
                calculation_run_id=calculation_run.id,
                error={"type": type(exc).__name__, "message": str(exc)},
                finished_at=finished_at,
            )
            return CalculationRunResult(
                calculation_run_id=failed.id,
                status=failed.status,
                report={},
                warnings=[],
            )

        report_payload = self._dump_report(report)
        succeeded = self._calculation_run_repository.mark_succeeded(
            calculation_run_id=calculation_run.id,
            report=report_payload,
            finished_at=finished_at,
            markdown_report_path=None,
        )
        warnings = report_payload.get("warnings", [])
        return CalculationRunResult(
            calculation_run_id=succeeded.id,
            status=succeeded.status,
            report=report_payload,
            warnings=warnings if isinstance(warnings, list) else [],
        )

    def run_latest_project_config(
        self,
        *,
        project_code: str,
        triggered_by: str,
        created_at: str,
        started_at: str,
        finished_at: str,
        hermes_session_id: str | None = None,
    ) -> CalculationRunResult:
        assert self._project_repository is not None
        project = self._project_repository.get_by_project_code(project_code)
        assert project is not None
        latest_config = self._input_config_repository.get_latest_for_project(project.id)
        assert latest_config is not None
        return self.run_saved_config(
            input_config_id=latest_config.id,
            triggered_by=triggered_by,
            created_at=created_at,
            started_at=started_at,
            finished_at=finished_at,
            hermes_session_id=hermes_session_id,
        )

    def validate_saved_config(self, input_config_id: str) -> ValidationResult:
        input_config = self._input_config_repository.get(input_config_id)
        assert input_config is not None
        return self._validation_service.validate_yaml_text(input_config.yaml_text)

    @staticmethod
    def _dump_report(report: Report | dict[str, object]) -> dict[str, object]:
        if isinstance(report, Report):
            payload = report.model_dump(mode="json", by_alias=True)
            return payload if isinstance(payload, dict) else {}
        return report
