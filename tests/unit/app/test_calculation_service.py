from __future__ import annotations

import json

import yaml

from brake_calc.app.services import CalculationService, ValidationService
from brake_calc.contracts.inputs import Inputs
from brake_calc.contracts.report import Report
from tests.unit.contracts.test_inputs import make_valid_bogie_payload


class FakeInputConfig:
    def __init__(self, *, input_config_id: str, project_id: str, yaml_text: str) -> None:
        self.id = input_config_id
        self.project_id = project_id
        self.version = 1
        self.schema_version = 1
        self.yaml_text = yaml_text
        self.form_state_json = json.dumps({"schema_version": 1}, ensure_ascii=True, sort_keys=True)
        self.validation_status = "valid"
        self.validation_errors_json = "[]"


class FakeInputConfigRepository:
    def __init__(self, item: FakeInputConfig) -> None:
        self._item = item

    def get(self, input_config_id: str) -> FakeInputConfig | None:
        return self._item if self._item.id == input_config_id else None


class FakeCalculationRun:
    def __init__(self, *, run_id: str, status: str, report_json: str | None = None) -> None:
        self.id = run_id
        self.project_id = "project-1"
        self.input_config_id = "input-1"
        self.status = status
        self.started_at = None
        self.finished_at = None
        self.triggered_by = "web_ui"
        self.hermes_session_id = None
        self.report_json = report_json
        self.markdown_report_path = None
        self.error_json = None
        self.created_at = "2026-04-25T13:00:00Z"


class FakeCalculationRunRepository:
    def __init__(self) -> None:
        self.created: FakeCalculationRun | None = None
        self.succeeded_report: dict[str, object] | None = None

    def create(
        self,
        *,
        project_id: str,
        input_config_id: str,
        triggered_by: str,
        created_at: str,
        hermes_session_id: str | None = None,
    ) -> FakeCalculationRun:
        self.created = FakeCalculationRun(run_id="run-1", status="queued")
        return self.created

    def mark_running(self, *, calculation_run_id: str, started_at: str) -> FakeCalculationRun:
        assert self.created is not None
        self.created.status = "running"
        self.created.started_at = started_at
        return self.created

    def mark_succeeded(
        self,
        *,
        calculation_run_id: str,
        report: object,
        finished_at: str,
        markdown_report_path: str | None,
    ) -> FakeCalculationRun:
        assert self.created is not None
        self.created.status = "succeeded"
        self.created.finished_at = finished_at
        self.created.report_json = json.dumps(report, ensure_ascii=True, sort_keys=True)
        self.created.markdown_report_path = markdown_report_path
        self.succeeded_report = report if isinstance(report, dict) else None
        return self.created

    def mark_failed(
        self,
        *,
        calculation_run_id: str,
        error: object,
        finished_at: str,
    ) -> FakeCalculationRun:
        assert self.created is not None
        self.created.status = "failed"
        self.created.finished_at = finished_at
        self.created.error_json = json.dumps(error, ensure_ascii=True, sort_keys=True)
        return self.created


def make_report() -> Report:
    return Report(
        pressure_standards={"AW0": {"FSB": {"bogie_1": 123.0}}},
        BCP_calibrated_by_controller={"AW0": {"FSB": {"bogie_1": 123.0}}},
        controller_pressure_standards={"AW0": {"FSB": {"bogie_1": 123.0}}},
        controller_code_params={
            "pressure_conversion": {
                "FSB": {"AW0": {"bogie_1": {"k_used_for_code": 1014.0, "BCP0_used_for_code": 25.0}}},
                "EB": {"AW0": {"bogie_1": {"k_used_for_code": 1123.0, "BCP0_used_for_code": 30.0}}},
            }
        },
        calibration_summary={"service_brake": {"BCP0": 25}},
        parking_brake_check_results_by_load_group={},
        auto_adjustments=[],
        warnings=[],
        clamp_events=[],
        trace=[],
    )


def test_calculation_service_runs_saved_config_and_persists_report() -> None:
    yaml_text = yaml.safe_dump(make_valid_bogie_payload(), sort_keys=False, allow_unicode=False)
    input_config_repository = FakeInputConfigRepository(
        FakeInputConfig(input_config_id="input-1", project_id="project-1", yaml_text=yaml_text)
    )
    run_repository = FakeCalculationRunRepository()
    service = CalculationService(
        input_config_repository=input_config_repository,
        calculation_run_repository=run_repository,
        validation_service=ValidationService(),
        run_workflow_fn=lambda inputs: make_report(),
    )

    result = service.run_saved_config(
        input_config_id="input-1",
        triggered_by="web_ui",
        created_at="2026-04-25T13:00:00Z",
        started_at="2026-04-25T13:00:01Z",
        finished_at="2026-04-25T13:00:02Z",
    )

    assert result.calculation_run_id == "run-1"
    assert result.status == "succeeded"
    assert result.report["calibration_summary"]["service_brake"]["BCP0"] == 25
    assert run_repository.succeeded_report is not None
    assert "controller_pressure_standards" in run_repository.succeeded_report


def test_calculation_service_returns_v1_report_sections() -> None:
    yaml_text = yaml.safe_dump(make_valid_bogie_payload(), sort_keys=False, allow_unicode=False)
    service = CalculationService(
        input_config_repository=FakeInputConfigRepository(
            FakeInputConfig(input_config_id="input-1", project_id="project-1", yaml_text=yaml_text)
        ),
        calculation_run_repository=FakeCalculationRunRepository(),
        validation_service=ValidationService(),
        run_workflow_fn=lambda inputs: make_report(),
    )

    result = service.run_saved_config(
        input_config_id="input-1",
        triggered_by="hermes",
        created_at="2026-04-25T13:00:00Z",
        started_at="2026-04-25T13:00:01Z",
        finished_at="2026-04-25T13:00:02Z",
    )

    assert "calibration_summary" in result.report
    assert "auto_adjustments" in result.report
    assert "parking_brake_check_results_by_load_group" in result.report
    assert "electric_brake_summary" in result.report


def test_calculation_service_preview_calibration_defaults_does_not_persist_run() -> None:
    yaml_text = yaml.safe_dump(make_valid_bogie_payload(), sort_keys=False, allow_unicode=False)
    run_repository = FakeCalculationRunRepository()
    service = CalculationService(
        input_config_repository=FakeInputConfigRepository(
            FakeInputConfig(input_config_id="input-1", project_id="project-1", yaml_text=yaml_text)
        ),
        calculation_run_repository=run_repository,
        validation_service=ValidationService(),
        run_workflow_fn=lambda inputs: make_report(),
    )

    preview = service.preview_calibration_defaults(input_config_id="input-1")

    assert preview["service_bcp0"] == 25.0
    assert run_repository.created is None


def test_calculation_service_preview_calibration_defaults_uses_baseline_without_calibration() -> None:
    payload = make_valid_bogie_payload()
    payload["pressure_calibration"]["service_brake"]["BCP0"] = 30.0
    yaml_text = yaml.safe_dump(payload, sort_keys=False, allow_unicode=False)
    captured_enabled: list[bool] = []

    def _capture_run(inputs: object) -> Report:
        assert isinstance(inputs, Inputs)
        pressure_calibration = inputs.pressure_calibration
        captured_enabled.append(pressure_calibration.enabled)
        return make_report()

    service = CalculationService(
        input_config_repository=FakeInputConfigRepository(
            FakeInputConfig(input_config_id="input-1", project_id="project-1", yaml_text=yaml_text)
        ),
        calculation_run_repository=FakeCalculationRunRepository(),
        validation_service=ValidationService(),
        run_workflow_fn=_capture_run,
    )

    _ = service.preview_calibration_defaults(input_config_id="input-1")

    assert captured_enabled == [False]
