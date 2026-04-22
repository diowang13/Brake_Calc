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
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s7_derives_tread_cylinder_pressure_parameters() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))

    out = run(ctx)

    expected_k = 1.0 / (4 * 1.0 * 1.0 * 0.29 * 3.4 * 0.95 * 0.0248)
    expected_bcp0 = (1.0 / (3.4 * 0.95) + 0.25) / 0.0248
    force = ctx.F_by_controller["FSB"]["AW0"]["powered_bogie_1"]

    assert out.k_initial == pytest.approx(expected_k)
    assert out.BCP0_initial == pytest.approx(expected_bcp0)
    assert out.BCP_base_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        expected_k * force + expected_bcp0
    )
