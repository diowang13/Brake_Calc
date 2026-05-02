from __future__ import annotations

from brake_calc.app.api import (
    download_yaml,
    import_yaml,
    list_projects,
    load_config,
    open_latest_project_config,
    run_config,
    save_config,
    validate_config,
)


class FakeValidationService:
    def validate_yaml_text(self, yaml_text: str) -> object:
        return type(
            "ValidationResult",
            (),
            {"valid": True, "errors": [], "normalized_inputs": {"schema_version": 1}},
        )()


class FakeConfigService:
    last_saved_request: object | None = None

    def save_config(self, request: object) -> object:
        self.last_saved_request = request
        return type(
            "SaveResult",
            (),
            {
                "project_id": "project-1",
                "input_config_id": "input-1",
                "version": 1,
                "validation_status": "valid",
                "errors": [],
            },
        )()

    def load_config(self, input_config_id: str) -> object:
        return type(
            "LoadResult",
            (),
            {
                "project": type(
                    "ProjectPayload",
                    (),
                    {
                        "project_name": "Line 1",
                        "project_code": "LINE-001",
                        "email": None,
                        "note": "",
                    },
                )(),
                "yaml_text": "schema_version: 1\n",
                "form_state": {"schema_version": 1},
                "validation_status": "valid",
                "errors": [],
            },
        )()

    def build_export_filename(self, *, project_code: str, created_at: str) -> str:
        return "LINE-001_input_20260425_1234.yaml"

    def load_latest_project_config(self, project_code: str) -> object:
        loaded = self.load_config("input-1")
        return type("OpenProjectResult", (), {"input_config_id": "input-1", "config": loaded})()

    def list_projects(self) -> list[dict[str, object]]:
        return [
            {
                "project_name": "Line 1",
                "project_code": "LINE-001",
                "updated_at": "2026-04-25T12:34:56Z",
                "latest_input_config_id": "input-1",
                "controller_type": "bogie",
            }
        ]


class FakeImportService:
    def import_yaml(self, yaml_text: str) -> object:
        return type(
            "ImportResult",
            (),
            {
                "valid": True,
                "errors": [],
                "inputs": {"schema_version": 1},
                "form_state": {"schema_version": 1},
            },
        )()


class FakeCalculationService:
    def run_saved_config(self, **_: object) -> object:
        return type(
            "RunResult",
            (),
            {
                "calculation_run_id": "run-1",
                "status": "succeeded",
                "report": {"controller_pressure_standards": {}},
                "warnings": [],
            },
        )()


def test_api_validate_maps_service_result() -> None:
    response = validate_config(
        {"yaml_text": "schema_version: 1\n"},
        validation_service=FakeValidationService(),
    )

    assert response["valid"] is True
    assert response["normalized_inputs"]["schema_version"] == 1


def test_api_save_load_import_download_and_run_map_service_results() -> None:
    config_service = FakeConfigService()

    saved = save_config(
        {
            "project": {
                "project_name": "Line 1",
                "project_code": "LINE-001",
                "email": None,
                "note": "",
            },
            "yaml_text": "schema_version: 1\n",
            "form_state": {"schema_version": 1},
            "validation_status": "valid",
            "errors": [],
            "created_at": "2026-04-25T12:34:56Z",
        },
        config_service=config_service,
    )
    loaded = load_config("input-1", config_service=config_service)
    imported = import_yaml({"yaml_text": "schema_version: 1\n"}, import_service=FakeImportService())
    downloaded = download_yaml(
        "input-1",
        created_at="2026-04-25T12:34:56Z",
        config_service=config_service,
    )
    run_response = run_config(
        "input-1",
        {
            "triggered_by": "web_ui",
            "created_at": "2026-04-25T13:00:00Z",
            "started_at": "2026-04-25T13:00:01Z",
            "finished_at": "2026-04-25T13:00:02Z",
        },
        calculation_service=FakeCalculationService(),
    )
    opened = open_latest_project_config("LINE-001", config_service=config_service)
    listed = list_projects(config_service=config_service)

    assert saved["input_config_id"] == "input-1"
    assert loaded["project"]["project_code"] == "LINE-001"
    assert imported["form_state"]["schema_version"] == 1
    assert downloaded["filename"] == "LINE-001_input_20260425_1234.yaml"
    assert run_response["status"] == "succeeded"
    assert opened["input_config_id"] == "input-1"
    assert listed["items"][0]["project_code"] == "LINE-001"
    assert config_service.last_saved_request is not None
    last_errors = getattr(config_service.last_saved_request, "errors")
    assert len(last_errors) == 0


def test_api_save_converts_error_dicts_to_validation_items() -> None:
    config_service = FakeConfigService()

    save_config(
        {
            "project": {
                "project_name": "Line 1",
                "project_code": "LINE-001",
                "email": None,
                "note": "",
            },
            "yaml_text": "schema_version: 1\n",
            "form_state": {"schema_version": 1},
            "validation_status": "invalid",
            "errors": [{"path": "v0", "message": "field required"}],
            "created_at": "2026-04-25T12:34:56Z",
        },
        config_service=config_service,
    )

    assert config_service.last_saved_request is not None
    last_errors = getattr(config_service.last_saved_request, "errors")
    assert len(last_errors) == 1
    first = last_errors[0]
    assert getattr(first, "path") == "v0"
    assert getattr(first, "message") == "field required"
