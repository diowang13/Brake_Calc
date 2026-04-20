from __future__ import annotations

import json
from pathlib import Path

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.contracts.report import Report
from tests.unit.contracts.test_inputs import make_valid_payload


def test_context_accepts_spec_defined_fields() -> None:
    inputs = Inputs.model_validate(make_valid_payload())
    report = Report(
        pressure_standards={"AW0": {"FSB": {"powered_bogie_1": 12.0}}},
        BCP_calibrated_by_controller={"AW0": {"FSB": {"powered_bogie_1": 12.0}}},
        warnings=[],
        clamp_events=[],
        trace=[],
    )

    context = Context(
        validated_inputs=inputs,
        a_mean_req={"FSB": 1.0, "EB": 1.2},
        Beta_list={"FSB": 1.1, "EB": 1.3},
        Mass_by_controller={"AW0": {"powered_bogie_1": {"mass_static": 1.0, "mass_dynamic": 1.1}}},
        AirSpringPressure_by_controller={"AW0": {"powered_bogie_1": 250.0}},
        AirSpringFit_by_bogie_type={
            "powered_bogie": {
                "k": 20.0,
                "b": 100.0,
                "source_mode": "explicit_linear",
            }
        },
        F_by_controller={"FSB": {"AW0": {"powered_bogie_1": 10.0}}},
        BCP_base_by_controller={"FSB": {"AW0": {"powered_bogie_1": 12.0}}},
        k_used_by_controller={"FSB": {"AW0": {"powered_bogie_1": 1.0}}},
        BCP_calibrated_by_controller={"AW0": {"FSB": {"powered_bogie_1": 12.0}}},
        clamp_events=[],
        warnings=[],
        trace=[],
        report=report,
    )

    assert context.report.BCP_calibrated_by_controller == {
        "AW0": {"FSB": {"powered_bogie_1": 12.0}}
    }


def test_context_schema_snapshot_matches_fixture() -> None:
    snapshot_path = Path("tests/fixtures/schemas/context.schema.json")
    schema_json = json.dumps(
        Context.model_json_schema(),
        indent=2,
        sort_keys=True,
        ensure_ascii=True,
    )

    assert schema_json == snapshot_path.read_text(encoding="utf-8")
