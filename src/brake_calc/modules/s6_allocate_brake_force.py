"""制动力分配校验模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.report import WarningEntry

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """校验并规范化控制器制动力输出。"""
    warnings = list(ctx.warnings)
    for brake_type, per_group in ctx.F_by_controller.items():
        for load_group, per_controller in per_group.items():
            for controller, force in per_controller.items():
                if force < 0:
                    warnings.append(
                        WarningEntry(
                            code="negative_force",
                            message="Negative force detected during allocation validation.",
                            context={
                                "brake_type": brake_type,
                                "load_group": load_group,
                                "controller": controller,
                                "force": force,
                            },
                        )
                    )
    return ctx.model_copy(update={"warnings": warnings})
