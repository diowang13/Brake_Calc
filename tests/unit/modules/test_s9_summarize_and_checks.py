from __future__ import annotations

import pytest

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run as run_s3
from brake_calc.modules.s4_calc_dynamic_load_and_mass import run as run_s4
from brake_calc.modules.s5_calc_required_brake_force import run as run_s5
from brake_calc.modules.s6_allocate_brake_force import run as run_s6
from brake_calc.modules.s7_force_to_pressure_base import run as run_s7
from brake_calc.modules.s8_apply_k_calibration import run as run_s8
from brake_calc.modules.s9_summarize_and_checks import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s9_builds_report_with_pressure_matrix_and_delta() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s8(run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))))

    out = run(ctx)

    assert out.report is not None
    assert out.report.BCP_calibrated_by_controller["AW0"]["FSB"]["powered_bogie_1"] > 0.0
    assert "AW0" in out.report.delta_BCP


def test_s9_report_includes_business_and_controller_development_outputs() -> None:
    payload = make_valid_payload()
    payload["V_list"] = [20.0, 40.0, 80.0]
    payload["requirement"]["EB"] = {"mode": "distance", "value": 180.0}
    payload["pressure_calibration"]["enabled"] = False
    ctx = Context(validated_inputs=Inputs.model_validate(payload))
    ctx = run_s8(run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))))

    out = run(ctx)

    assert out.report is not None
    assert out.report.brake_summary["FSB"]["beta"] == pytest.approx(round(ctx.Beta_list["FSB"], 3))
    assert out.report.load_summary["AW0"]["powered_bogie_1"]["mass_dynamic"] == pytest.approx(
        round(ctx.Mass_by_controller["AW0"]["powered_bogie_1"]["mass_dynamic"], 2)
    )
    assert out.report.load_summary["AW0"]["powered_bogie_1"]["spring_pressure"] == pytest.approx(
        round(ctx.AirSpringPressure_by_controller["AW0"]["powered_bogie_1"])
    )
    assert (
        out.report.controller_pressure_standards["AW0"]["FSB"]["powered_bogie_1"]
        == out.report.BCP_calibrated_by_controller["AW0"]["FSB"]["powered_bogie_1"]
    )
    assert sorted(out.report.theoretical_speed_checks["FSB"]) == ["20.0", "40.0", "80.0"]
    assert "holding" not in out.report.theoretical_speed_checks
    assert out.report.theoretical_speed_checks["EB"]["40.0"]["beta_used"] == pytest.approx(
        round(ctx.Beta_list["EB"], 3)
    )
    assert out.report.theoretical_speed_checks["EB"]["40.0"]["theoretical_distance_m"] != 180.0
    assert (
        out.report.controller_code_params["pressure_conversion"]["FSB"]["AW0"][
            "powered_bogie_1"
        ]["k_used_for_code"]
        == 1077
    )
    assert (
        out.report.controller_code_params["pressure_conversion"]["FSB"]["AW0"][
            "powered_bogie_1"
        ]["BCP0_used_for_code"]
        == 25
    )
    assert (
        out.report.controller_code_params["dynamic_mass_formula"]["powered_bogie"][
            "expression"
        ].startswith("mass_dynamic_ton = ")
    )


def test_s9_theoretical_speed_checks_default_to_v0_when_v_list_is_missing() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s8(run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))))

    out = run(ctx)

    assert out.report is not None
    assert sorted(out.report.theoretical_speed_checks["FSB"]) == ["80.0"]
