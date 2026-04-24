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
from tests.unit.contracts.test_inputs import make_valid_bogie_payload, make_valid_car_payload


def test_s9_builds_report_with_pressure_matrix_and_delta() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_bogie_payload()))
    ctx = run_s8(run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))))

    out = run(ctx)

    assert out.report is not None
    assert out.report.BCP_calibrated_by_controller["AW0"]["FSB"]["powered_bogie_1"] > 0.0
    assert "AW0" in out.report.delta_BCP


def test_s9_report_includes_business_and_controller_development_outputs() -> None:
    payload = make_valid_bogie_payload()
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
    assert out.report.calibration_summary == {}


def test_s9_report_includes_calibration_summary_when_enabled() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_bogie_payload()))
    ctx = run_s8(run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))))

    out = run(ctx)

    assert out.report is not None
    assert (
        out.report.calibration_summary["service_brake"]["curve_points"][0]["k_for_code"] == 1050
    )
    assert (
        out.report.calibration_summary["emergency_brake"]["curve_points"][1]["k_for_code"]
        == 1250
    )


def test_s9_theoretical_speed_checks_default_to_v0_when_v_list_is_missing() -> None:
    payload = make_valid_bogie_payload()
    payload["V_list"] = None
    ctx = Context(validated_inputs=Inputs.model_validate(payload))
    ctx = run_s8(run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))))

    out = run(ctx)

    assert out.report is not None
    assert sorted(out.report.theoretical_speed_checks["FSB"]) == ["80.0"]


def test_s9_report_includes_parking_brake_auto_adjustments_and_electric_brake_summary() -> None:
    payload = make_valid_car_payload()
    payload["electric_brake"] = {
        "enabled": True,
        "force_scope": "per_car",
        "characteristic_points": [
            {"speed_kmh": 0.0, "force_kN": 0.0},
            {"speed_kmh": 10.0, "force_kN": 20.0},
            {"speed_kmh": 20.0, "force_kN": 40.0},
            {"speed_kmh": 30.0, "force_kN": 55.0},
            {"speed_kmh": 40.0, "force_kN": 70.0},
            {"speed_kmh": 50.0, "force_kN": 80.0},
            {"speed_kmh": 60.0, "force_kN": 90.0},
        ],
    }
    ctx = Context(validated_inputs=Inputs.model_validate(payload))
    ctx = run_s8(run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))))
    object.__setattr__(
        ctx,
        "auto_adjustments",
        [
            {
                "code": "adhesion.equal_wear_to_equal_adhesion",
                "message": "equal_wear exceeds mu_limit and falls back to equal_adhesion",
                "original": {"allocation_strategy": "equal_wear"},
                "applied": {"allocation_strategy": "equal_adhesion"},
                "context": {"brake_type": "FB", "load_group": "AW3"},
            }
        ],
    )

    out = run(ctx)

    assert out.report is not None
    assert sorted(out.report.parking_brake_check_result.per_car) == [
        "powered_car_1",
        "trailer_car_1",
    ]
    assert out.report.parking_brake_check_result.whole_train.F_PB > 0.0
    assert out.report.parking_brake_check_result.pass_ is False
    assert out.report.auto_adjustments[0].code == "adhesion.equal_wear_to_equal_adhesion"
    assert out.report.auto_adjustments[0].applied["allocation_strategy"] == "equal_adhesion"
    assert out.report.electric_brake_summary.enabled is True
    assert out.report.electric_brake_summary.force_scope == "per_car"
    assert len(out.report.electric_brake_summary.preview_head) == 3
    assert len(out.report.electric_brake_summary.preview_tail) == 3
