from __future__ import annotations

import yaml

from brake_calc.app.services import ValidationService
from tests.unit.contracts.test_inputs import make_valid_bogie_payload


def test_validation_service_accepts_example_yaml() -> None:
    service = ValidationService()
    yaml_text = yaml.safe_dump(make_valid_bogie_payload(), sort_keys=False, allow_unicode=False)

    result = service.validate_yaml_text(yaml_text)

    assert result.valid is True
    assert result.errors == []
    assert result.normalized_inputs["schema_version"] == 1
    assert result.normalized_inputs["controller_type"] == "bogie"


def test_validation_service_reports_invalid_yaml() -> None:
    service = ValidationService()

    result = service.validate_yaml_text("v0: [broken")

    assert result.valid is False
    assert result.normalized_inputs is None
    assert result.errors[0].path == "yaml_text"


def test_validation_service_reports_extra_field_path() -> None:
    service = ValidationService()
    payload = make_valid_bogie_payload()
    payload["unexpected"] = 123

    result = service.validate_inputs_payload(payload)

    assert result.valid is False
    assert result.normalized_inputs is None
    assert result.errors[0].path == "unexpected"


def test_validation_service_reports_invalid_enum_path() -> None:
    service = ValidationService()
    payload = make_valid_bogie_payload()
    payload["controller_type"] = "train"

    result = service.validate_inputs_payload(payload)

    assert result.valid is False
    assert result.normalized_inputs is None
    assert result.errors[0].path == "controller_type"
