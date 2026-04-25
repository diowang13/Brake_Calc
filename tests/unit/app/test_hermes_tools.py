from __future__ import annotations

from brake_calc.app.hermes_tools import (
    run_latest_project_config,
    run_saved_config,
    validate_saved_config,
)


class FakeHermesService:
    def validate_saved_config(self, input_config_id: str) -> dict[str, object]:
        return {"valid": True, "input_config_id": input_config_id}

    def run_saved_config(self, input_config_id: str) -> dict[str, object]:
        return {"status": "succeeded", "input_config_id": input_config_id}

    def run_latest_project_config(self, project_code: str) -> dict[str, object]:
        return {"status": "succeeded", "project_code": project_code}


def test_hermes_tools_support_input_config_id_entry() -> None:
    service = FakeHermesService()

    validate_result = validate_saved_config("input-1", service=service)
    run_result = run_saved_config("input-1", service=service)

    assert validate_result["input_config_id"] == "input-1"
    assert run_result["status"] == "succeeded"


def test_hermes_tools_support_project_code_entry() -> None:
    service = FakeHermesService()

    result = run_latest_project_config("LINE-001", service=service)

    assert result["project_code"] == "LINE-001"
