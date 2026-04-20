from __future__ import annotations

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s2_derives_mean_deceleration_from_distance_requirement() -> None:
    payload = make_valid_payload()
    payload["requirement"]["EB"] = {"mode": "distance", "value": 180.0}
    ctx = Context(validated_inputs=Inputs.model_validate(payload))

    out = run(ctx)

    assert out.a_mean_req["FSB"] == 1.0
    assert out.a_mean_req["EB"] > 1.0


def test_s2_only_derives_requirement_for_kinematic_types() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))

    out = run(ctx)

    assert set(out.a_mean_req) == {"FSB", "EB"}
