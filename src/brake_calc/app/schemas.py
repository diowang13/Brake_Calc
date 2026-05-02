from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ValidationErrorItem:
    path: str
    message: str


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    errors: list[ValidationErrorItem]
    normalized_inputs: dict[str, object] | None


@dataclass(frozen=True)
class ProjectPayload:
    project_name: str
    project_code: str
    email: str | None
    note: str


@dataclass(frozen=True)
class SaveConfigRequest:
    project: ProjectPayload
    yaml_text: str
    form_state: dict[str, object]
    validation_status: str
    errors: list[ValidationErrorItem]
    created_at: str
    source_input_config_id: str | None = None
    revision_reason: str | None = None


@dataclass(frozen=True)
class SaveConfigResult:
    project_id: str
    input_config_id: str
    version: int
    validation_status: str
    errors: list[ValidationErrorItem]


@dataclass(frozen=True)
class LoadConfigResult:
    project: ProjectPayload
    yaml_text: str
    form_state: dict[str, object]
    validation_status: str
    errors: list[ValidationErrorItem]
    version: int
    source_input_config_id: str | None
    revision_reason: str | None


@dataclass(frozen=True)
class YamlImportResult:
    valid: bool
    errors: list[ValidationErrorItem]
    inputs: dict[str, object] | None
    form_state: dict[str, object] | None


@dataclass(frozen=True)
class CalculationRunResult:
    calculation_run_id: str
    status: str
    report: dict[str, object]
    warnings: list[object]


@dataclass(frozen=True)
class OpenProjectResult:
    input_config_id: str
    config: LoadConfigResult
