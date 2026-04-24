from __future__ import annotations

import pytest

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run as run_s3
from brake_calc.modules.s4_calc_dynamic_load_and_mass import run as run_s4
from brake_calc.modules.s5_calc_required_brake_force import run as run_s5
from brake_calc.modules.s6_allocate_brake_force import run as run_s6
from brake_calc.modules.s7_force_to_pressure_base import run
from tests.unit.contracts.test_inputs import make_valid_bogie_payload


def build_ctx(payload: dict[str, object] | None = None) -> Context:
    """构造运行到 S7 前的上下文。"""
    inputs_payload = make_valid_bogie_payload() if payload is None else payload
    ctx = Context(validated_inputs=Inputs.model_validate(inputs_payload))
    return run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))


def test_s7_derives_tread_cylinder_pressure_parameters() -> None:
    ctx = build_ctx()

    out = run(ctx)

    expected_ratio = 1.0
    expected_k = 1.0 / (4 * 1.0 * 1.0 * 0.29 * 3.4 * 0.95 * 0.0248 * expected_ratio)
    expected_bcp0 = (1.0 / (3.4 * 0.95) + 0.25) / 0.0248
    force = ctx.F_by_controller["FSB"]["AW0"]["powered_bogie_1"]

    assert out.k_initial == pytest.approx(expected_k)
    assert out.BCP0_initial == pytest.approx(expected_bcp0)
    assert out.BCP_base_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        expected_k * force + expected_bcp0
    )


def test_s7_derives_caliper_cylinder_pressure_parameters_from_dw_and_rf() -> None:
    payload = make_valid_bogie_payload()
    payload["mech_params"] = {
        **payload["mech_params"],
        "cylinder_type": "caliper_cylinder",
        "Dw": 0.72,
        "Rf": 0.18,
    }
    ctx = build_ctx(payload)

    out = run(ctx)

    expected_ratio = 0.72 / (2 * 0.18)
    expected_k = 1.0 / (4 * 1.0 * 1.0 * 0.29 * 3.4 * 0.95 * 0.0248 * expected_ratio)
    expected_bcp0 = (1.0 / (3.4 * 0.95) + 0.25) / (0.0248 * expected_ratio)
    force = ctx.F_by_controller["FSB"]["AW0"]["powered_bogie_1"]

    assert out.k_initial == pytest.approx(expected_k)
    assert out.BCP0_initial == pytest.approx(expected_bcp0)
    assert out.BCP_base_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        expected_k * force + expected_bcp0
    )
