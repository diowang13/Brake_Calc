from __future__ import annotations

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s1_validate_inputs import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s1_returns_validated_inputs_context() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))

    out = run(ctx)

    assert out.validated_inputs is not None
    assert out.validated_inputs.brake_types[0].name == "FSB"
