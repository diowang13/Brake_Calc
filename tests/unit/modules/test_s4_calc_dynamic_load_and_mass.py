from __future__ import annotations

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run as run_s3
from brake_calc.modules.s4_calc_dynamic_load_and_mass import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s4_calculates_static_and_dynamic_mass_by_controller() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s3(run_s2(ctx))

    out = run(ctx)

    assert out.Mass_by_controller["AW0"]["C1"]["mass_static"] == 10000.0
    assert out.Mass_by_controller["AW0"]["C1"]["mass_dynamic"] > 10000.0
