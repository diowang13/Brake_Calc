from __future__ import annotations

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run as run_s3
from brake_calc.modules.s4_calc_dynamic_load_and_mass import run as run_s4
from brake_calc.modules.s5_calc_required_brake_force import run as run_s5
from brake_calc.modules.s6_allocate_brake_force import run as run_s6
from brake_calc.modules.s7_force_to_pressure_base import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s7_converts_force_to_pressure_with_default_k() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))

    out = run(ctx)

    assert out.BCP_base_by_controller["FSB"]["AW0"]["C1"] > 0.0
