"""目标制动力计算模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.domain.calibration import resolve_brake_mode
from brake_calc.domain.forces import (
    equal_adhesion_distribution,
    equal_wear_distribution,
    total_brake_force_kn,
)
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """按策略计算每控制器目标制动力。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s5")

    brake_type_definitions = {item.name: item for item in inputs.brake_types}
    forces: dict[str, dict[str, dict[str, float]]] = {}
    for brake_type, beta in ctx.Beta_list.items():
        brake_type_def = brake_type_definitions[brake_type]
        brake_mode = resolve_brake_mode(brake_type_def.name, brake_type_def.source)
        per_group: dict[str, dict[str, float]] = {}
        for load_group in inputs.load_groups:
            dynamic_masses = {
                controller: values["mass_dynamic"]
                for controller, values in ctx.Mass_by_controller[load_group].items()
            }
            static_masses = {
                controller: values["mass_static"]
                for controller, values in ctx.Mass_by_controller[load_group].items()
            }
            total_force = total_brake_force_kn(dynamic_masses, beta)
            if brake_mode in {"EB", "FB"} or brake_type == "EB":
                per_group[load_group] = equal_adhesion_distribution(static_masses, total_force)
            elif inputs.allocation_strategy == "equal_adhesion":
                per_group[load_group] = equal_adhesion_distribution(static_masses, total_force)
            else:
                per_group[load_group] = equal_wear_distribution(list(static_masses), total_force)
        forces[brake_type] = per_group
    return ctx.model_copy(update={"F_by_controller": forces})
