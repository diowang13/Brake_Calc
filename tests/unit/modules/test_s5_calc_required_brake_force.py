from __future__ import annotations

import pytest

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run as run_s3
from brake_calc.modules.s4_calc_dynamic_load_and_mass import run as run_s4
from brake_calc.modules.s5_calc_required_brake_force import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s5_applies_equal_wear_for_fsb_and_equal_adhesion_for_eb() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s4(run_s3(run_s2(ctx)))

    out = run(ctx)

    assert out.F_by_controller["FSB"]["AW0"]["powered_bogie_1"] == pytest.approx(
        out.F_by_controller["FSB"]["AW0"]["trailer_bogie_1"]
    )
    assert out.F_by_controller["EB"]["AW0"]["powered_bogie_1"] != pytest.approx(
        out.F_by_controller["EB"]["AW0"]["trailer_bogie_1"]
    )
