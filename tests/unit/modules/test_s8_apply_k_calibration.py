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
from brake_calc.modules.s8_apply_k_calibration import run
from tests.unit.contracts.test_inputs import make_valid_bogie_payload


def build_ctx(payload: dict[str, object] | None = None) -> Context:
    """构造运行到 S8 前的上下文。"""
    inputs_payload = make_valid_bogie_payload() if payload is None else payload
    ctx = Context(validated_inputs=Inputs.model_validate(inputs_payload))
    return run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx))))))


def _linear_value(x: float, x1: float, y1: float, x2: float, y2: float) -> float:
    if x2 == x1:
        return y2
    return y1 + (y2 - y1) * ((x - x1) / (x2 - x1))


def test_s8_uses_point_driven_service_and_emergency_curves() -> None:
    ctx = build_ctx()

    out = run(ctx)

    fsb_aw0_force = ctx.F_by_controller["FSB"]["AW0"]["powered_bogie_1"]
    fb_aw0_force = ctx.F_by_controller["FB"]["AW0"]["powered_bogie_1"]
    eb_aw0_force = ctx.F_by_controller["EB"]["AW0"]["powered_bogie_1"]

    service_aw0_ref = max(ctx.F_by_controller["FB"]["AW0"].values())
    service_aw3_ref = min(ctx.F_by_controller["FSB"]["AW3"].values())
    emergency_aw0_ref = max(ctx.F_by_controller["EB"]["AW0"].values())
    emergency_aw3_ref = min(ctx.F_by_controller["EB"]["AW3"].values())

    expected_service_k_fsb = _linear_value(
        fsb_aw0_force,
        service_aw0_ref,
        10.5,
        service_aw3_ref,
        12.0,
    )
    expected_service_k_fb = _linear_value(
        fb_aw0_force,
        service_aw0_ref,
        10.5,
        service_aw3_ref,
        12.0,
    )
    expected_emergency_k = _linear_value(
        eb_aw0_force,
        emergency_aw0_ref,
        11.0,
        emergency_aw3_ref,
        12.5,
    )

    assert out.k_used_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        expected_service_k_fsb
    )
    assert out.BCP0_used_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(25.0)
    assert out.k_used_by_controller["FB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        expected_service_k_fb
    )
    assert out.BCP0_used_by_controller["FB"]["AW0"]["powered_bogie_1"] == pytest.approx(25.0)
    assert out.k_used_by_controller["EB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        expected_emergency_k
    )
    assert out.BCP0_used_by_controller["EB"]["AW0"]["powered_bogie_1"] == pytest.approx(30.0)


def test_s8_extrapolates_aw3_aw2_pair_to_aw0_reference_range() -> None:
    payload = make_valid_bogie_payload()
    payload["pressure_calibration"]["service_brake"]["point_pair_mode"] = "aw3_aw2"
    payload["pressure_calibration"]["service_brake"]["points"] = [
        {"load_group": "AW2", "brake_type": "FSB", "k_for_code": 1150.0},
        {"load_group": "AW3", "brake_type": "FSB", "k_for_code": 1200.0},
    ]
    ctx = build_ctx(payload)

    out = run(ctx)

    aw0_force = ctx.F_by_controller["FSB"]["AW0"]["powered_bogie_1"]
    aw2_ref = sum(ctx.F_by_controller["FSB"]["AW2"].values()) / len(
        ctx.F_by_controller["FSB"]["AW2"]
    )
    aw3_ref = min(ctx.F_by_controller["FSB"]["AW3"].values())
    expected_k_aw0 = _linear_value(aw0_force, aw2_ref, 11.5, aw3_ref, 12.0)

    assert out.k_used_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        expected_k_aw0
    )
    assert out.k_used_by_controller["FSB"]["AW0"]["powered_bogie_1"] != pytest.approx(
        ctx.k_initial
    )


def test_s8_can_skip_pressure_calibration() -> None:
    payload = make_valid_bogie_payload()
    payload["pressure_calibration"]["enabled"] = False
    ctx = build_ctx(payload)

    out = run(ctx)
    force = ctx.F_by_controller["FSB"]["AW0"]["powered_bogie_1"]

    assert out.k_used_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        ctx.k_initial
    )
    assert out.BCP0_used_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        ctx.BCP0_initial
    )
    assert out.BCP_calibrated_by_controller["AW0"]["FSB"]["powered_bogie_1"] == pytest.approx(
        ctx.k_initial * force + ctx.BCP0_initial
    )


def test_s8_raises_eb_bcp0_when_fb_pressure_exceeds_eb() -> None:
    payload = make_valid_bogie_payload()
    payload["pressure_calibration"]["service_brake"]["BCP0"] = 80.0
    payload["pressure_calibration"]["service_brake"]["points"] = [
        {"load_group": "AW0", "brake_type": "FB", "k_for_code": 2500.0},
        {"load_group": "AW3", "brake_type": "FSB", "k_for_code": 2600.0},
    ]
    payload["pressure_calibration"]["emergency_brake"]["BCP0"] = 10.0
    payload["pressure_calibration"]["emergency_brake"]["points"] = [
        {"load_group": "AW0", "brake_type": "EB", "k_for_code": 500.0},
        {"load_group": "AW3", "brake_type": "EB", "k_for_code": 600.0},
    ]
    ctx = build_ctx(payload)

    out = run(ctx)

    original_bcp0_eb = payload["pressure_calibration"]["emergency_brake"]["BCP0"]
    adjusted_bcp0_eb = out.BCP0_used_by_controller["EB"]["AW0"]["powered_bogie_1"]

    assert adjusted_bcp0_eb > original_bcp0_eb
    assert (
        out.BCP_calibrated_by_controller["AW0"]["EB"]["powered_bogie_1"]
        >= out.BCP_calibrated_by_controller["AW0"]["FB"]["powered_bogie_1"]
    )
    assert any(item.code == "fb_pressure_exceeded_eb" for item in out.warnings)
