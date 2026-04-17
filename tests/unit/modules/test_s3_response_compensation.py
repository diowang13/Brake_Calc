from __future__ import annotations

import pytest

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s3_generates_beta_list_with_copy_and_ratio_rules() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s2(ctx)

    out = run(ctx)

    assert out.Beta_list["FB"] == pytest.approx(out.Beta_list["EB"])
    assert out.Beta_list["holding"] == pytest.approx(out.Beta_list["FSB"] * 0.5)
    assert out.Beta_list["EB"] >= out.a_mean_req["EB"]
