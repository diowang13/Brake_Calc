"""技术条件换算模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.domain.kinematics import derive_mean_deceleration
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """将 requirement 统一换算为 a_mean_req。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s2")

    a_mean_req = {}
    for brake_type in inputs.brake_types:
        if brake_type.source != "kinematic":
            continue
        requirement = inputs.requirement[brake_type.name]
        a_mean_req[brake_type.name] = derive_mean_deceleration(
            inputs.v0,
            requirement.mode,
            requirement.value,
        )
    return ctx.model_copy(update={"a_mean_req": a_mean_req})
