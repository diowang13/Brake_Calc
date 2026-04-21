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


def test_s5_uses_dynamic_mass_ratio_for_eb_equal_adhesion_distribution() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s4(run_s3(run_s2(ctx)))

    out = run(ctx)

    eb_aw0 = out.F_by_controller["EB"]["AW0"]
    dynamic_masses = ctx.Mass_by_controller["AW0"]
    expected_ratio = (
        dynamic_masses["powered_bogie_1"]["mass_dynamic"]
        / dynamic_masses["trailer_bogie_1"]["mass_dynamic"]
    )

    assert eb_aw0["powered_bogie_1"] / eb_aw0["trailer_bogie_1"] == pytest.approx(
        expected_ratio
    )


def test_s5_uses_dynamic_mass_ratio_for_configured_equal_adhesion_distribution() -> None:
    payload = make_valid_payload()
    payload["allocation_strategy"] = "equal_adhesion"
    ctx = Context(validated_inputs=Inputs.model_validate(payload))
    ctx = run_s4(run_s3(run_s2(ctx)))

    out = run(ctx)

    fsb_aw0 = out.F_by_controller["FSB"]["AW0"]
    dynamic_masses = ctx.Mass_by_controller["AW0"]
    expected_ratio = (
        dynamic_masses["powered_bogie_1"]["mass_dynamic"]
        / dynamic_masses["trailer_bogie_1"]["mass_dynamic"]
    )

    assert fsb_aw0["powered_bogie_1"] / fsb_aw0["trailer_bogie_1"] == pytest.approx(
        expected_ratio
    )
