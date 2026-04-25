from __future__ import annotations

import yaml

from brake_calc.app.services import ValidationService, YamlImportService
from tests.unit.contracts.test_inputs import make_valid_bogie_payload


def test_yaml_import_service_returns_valid_inputs_and_form_state() -> None:
    payload = make_valid_bogie_payload()
    payload["mech_params"]["cylinder_type"] = "caliper_cylinder"
    payload["mech_params"]["Dw"] = 0.72
    payload["mech_params"]["Rf"] = 0.18
    yaml_text = yaml.safe_dump(payload, sort_keys=False, allow_unicode=False)

    service = YamlImportService(validation_service=ValidationService())
    result = service.import_yaml(yaml_text)

    assert result.valid is True
    assert result.inputs is not None
    assert result.form_state is not None
    assert result.form_state["schema_version"] == 1
    assert result.form_state["controller_type"] == "bogie"
    assert result.form_state["parking_brake_check"]["enabled"] is True
    assert result.form_state["adhesion"]["mu_limit"] == 0.16
    assert result.form_state["mech_params"]["cylinder_type"] == "caliper_cylinder"
    assert result.form_state["mech_params"]["Dw"] == 0.72
    assert (
        result.form_state["pressure_calibration"]["service_brake"]["point_pair_mode"]
        == "aw3_aw0"
    )
    assert any(item["name"] == "FB" for item in result.form_state["brake_types"])


def test_yaml_import_service_reports_invalid_yaml() -> None:
    service = YamlImportService(validation_service=ValidationService())

    result = service.import_yaml("v0: [broken")

    assert result.valid is False
    assert result.inputs is None
    assert result.form_state is None
    assert result.errors[0].path == "yaml_text"
