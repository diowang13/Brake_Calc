"""响应时间补偿模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.domain.kinematics import compensate_target_deceleration
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """根据 t1/t2 反推控制用目标减速度并生成 Beta_list。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s3")

    beta_list: dict[str, float] = {}
    for brake_type in inputs.brake_types:
        if brake_type.source == "kinematic":
            response_time = inputs.response_time[brake_type.name]
            beta_list[brake_type.name] = compensate_target_deceleration(
                inputs.v0,
                ctx.a_mean_req[brake_type.name],
                response_time.t1,
                response_time.t2,
            )
        elif brake_type.source == "copy_of_EB":
            beta_list[brake_type.name] = beta_list["EB"]
        else:
            assert brake_type.ratio is not None
            beta_list[brake_type.name] = beta_list["FSB"] * brake_type.ratio
    return ctx.model_copy(update={"Beta_list": beta_list})
