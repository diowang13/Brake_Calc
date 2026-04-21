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

    assert out.Beta_list["holding"] == pytest.approx(out.Beta_list["FSB"] * 0.5)
    assert out.Beta_list["EB"] >= out.a_mean_req["EB"]
    assert out.Beta_list["FSB"] >= out.a_mean_req["FSB"]


def test_s3_uses_distance_loss_model_for_eb_compensation() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s2(ctx)

    out = run(ctx)

    assert out.Beta_list["EB"] == pytest.approx(1.2831479897348161)


def test_s3_uses_distance_loss_model_for_fsb_impulse_compensation() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s2(ctx)

    out = run(ctx)

    assert out.Beta_list["FSB"] == pytest.approx(1.0731866021704843)


def test_s3_uses_impulse_rate_for_fsb_compensation() -> None:
    payload = make_valid_payload()
    payload["response_time"]["FSB"]["impulse_rate"] = 2.5
    fast_ctx = Context(validated_inputs=Inputs.model_validate(payload))
    fast_ctx = run_s2(fast_ctx)

    slow_payload = make_valid_payload()
    slow_payload["response_time"]["FSB"]["impulse_rate"] = 0.5
    slow_ctx = Context(validated_inputs=Inputs.model_validate(slow_payload))
    slow_ctx = run_s2(slow_ctx)

    fast_out = run(fast_ctx)
    slow_out = run(slow_ctx)

    assert slow_out.Beta_list["FSB"] > fast_out.Beta_list["FSB"]
