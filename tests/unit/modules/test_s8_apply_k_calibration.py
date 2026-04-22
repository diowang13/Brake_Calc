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
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s8_uses_aw2_fallback_and_records_warning() -> None:
    payload = make_valid_payload()
    ctx = Context(validated_inputs=Inputs.model_validate(payload))
    ctx = run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx))))))

    out = run(ctx)

    force = ctx.F_by_controller["FSB"]["AW2"]["powered_bogie_1"]

    assert out.k_used_by_controller["FSB"]["AW2"]["powered_bogie_1"] == 12.0
    assert out.BCP0_used_by_controller["FSB"]["AW2"]["powered_bogie_1"] == 30.0
    assert out.BCP_calibrated_by_controller["AW2"]["FSB"]["powered_bogie_1"] == pytest.approx(
        12.0 * force + 30.0
    )
    assert any(item.code == "pressure_calibration_fallback" for item in out.warnings)


def test_s8_can_skip_pressure_calibration() -> None:
    payload = make_valid_payload()
    payload["pressure_calibration"]["enabled"] = False
    ctx = Context(validated_inputs=Inputs.model_validate(payload))
    ctx = run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx))))))

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


def test_s8_clamps_fsb_to_clamped_eb_pressure() -> None:
    payload = make_valid_payload()
    payload["pressure_calibration"]["calibrated"]["AW0"]["FSB"]["k_segments"][0]["value"] = 100.0
    payload["pressure_calibration"]["calibrated"]["AW0"]["EB"]["k_segments"][0]["value"] = 100.0
    ctx = Context(validated_inputs=Inputs.model_validate(payload))
    ctx = run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx))))))

    out = run(ctx)

    assert out.BCP_calibrated_by_controller["AW0"]["EB"]["powered_bogie_1"] == 600.0
    assert out.BCP_calibrated_by_controller["AW0"]["FSB"]["powered_bogie_1"] == 600.0
