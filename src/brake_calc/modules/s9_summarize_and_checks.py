"""汇总与检查模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.report import Report

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """汇总最终 report。"""
    delta_bcp: dict[str, dict[str, dict[str, float]]] = {}
    for load_group, per_brake_type in ctx.BCP_calibrated_by_controller.items():
        delta_bcp[load_group] = {}
        for brake_type, per_controller in per_brake_type.items():
            delta_bcp[load_group][brake_type] = {}
            for controller, calibrated in per_controller.items():
                base = ctx.BCP_base_by_controller[brake_type][load_group][controller]
                delta_bcp[load_group][brake_type][controller] = calibrated - base

    report = Report(
        pressure_standards=ctx.BCP_calibrated_by_controller,
        BCP_calibrated_by_controller=ctx.BCP_calibrated_by_controller,
        warnings=ctx.warnings,
        clamp_events=ctx.clamp_events,
        trace=ctx.trace,
        delta_BCP=delta_bcp,
    )
    return ctx.model_copy(update={"report": report})
