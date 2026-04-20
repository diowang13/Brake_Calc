"""响应时间补偿模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.domain.kinematics import compensate_target_deceleration, solve_fsb_target_deceleration
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """根据响应参数反推控制用目标减速度并生成 Beta_list。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s3")

    beta_list: dict[str, float] = {}
    beta_list["FSB"] = solve_fsb_target_deceleration(
        inputs.v0,
        ctx.a_mean_req["FSB"],
        inputs.response_time.FSB.t1,
        inputs.response_time.FSB.impulse_rate,
    )
    beta_list["EB"] = compensate_target_deceleration(
        inputs.v0,
        ctx.a_mean_req["EB"],
        inputs.response_time.EB.t1,
        inputs.response_time.EB.t2,
    )

    for brake_type in inputs.brake_types:
        if brake_type.source != "ratio_of_FSB":
            continue
        assert brake_type.ratio is not None
        beta_list[brake_type.name] = beta_list["FSB"] * brake_type.ratio
    return ctx.model_copy(update={"Beta_list": beta_list})
