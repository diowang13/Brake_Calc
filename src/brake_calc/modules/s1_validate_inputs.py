"""输入校验模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """校验输入结构并产出可信赖的 validated_inputs。"""
    if ctx.validated_inputs is None:
        raise InputValidationError("validated_inputs is required before s1")
    validated_inputs = Inputs.model_validate(ctx.validated_inputs.model_dump())
    return ctx.model_copy(update={"validated_inputs": validated_inputs})
