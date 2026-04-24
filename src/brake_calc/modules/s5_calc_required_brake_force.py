"""目标制动力计算模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.report import WarningEntry
from brake_calc.domain.calibration import resolve_brake_mode
from brake_calc.domain.forces import (
    equal_adhesion_distribution,
    equal_wear_distribution,
    total_brake_force_kn,
)
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)
GRAVITY_MPS2 = 9.81


def _adhesion_ratio_by_controller(
    controller_forces: dict[str, float],
    dynamic_masses: dict[str, float],
) -> dict[str, float]:
    """估算各控制器的黏着利用率。"""
    return {
        controller: (
            controller_forces[controller] / (dynamic_masses[controller] * GRAVITY_MPS2)
            if dynamic_masses[controller] > 0
            else 0.0
        )
        for controller in controller_forces
    }


def run(ctx: Context) -> Context:
    """按策略计算每控制器目标制动力。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s5")

    brake_type_definitions = {item.name: item for item in inputs.brake_types}
    forces: dict[str, dict[str, dict[str, float]]] = {}
    warnings = list(ctx.warnings)
    for brake_type, beta in ctx.Beta_list.items():
        brake_type_def = brake_type_definitions[brake_type]
        brake_mode = resolve_brake_mode(brake_type_def.name, brake_type_def.source)
        per_group: dict[str, dict[str, float]] = {}
        for load_group in inputs.load_groups:
            dynamic_masses = {
                controller: values["mass_dynamic"]
                for controller, values in ctx.Mass_by_controller[load_group].items()
            }
            total_force = total_brake_force_kn(dynamic_masses, beta)
            if brake_mode in {"EB", "FB"} or brake_type == "EB":
                per_group[load_group] = equal_adhesion_distribution(dynamic_masses, total_force)
            elif inputs.allocation_strategy == "equal_adhesion":
                per_group[load_group] = equal_adhesion_distribution(dynamic_masses, total_force)
            else:
                equal_wear = equal_wear_distribution(list(dynamic_masses), total_force)
                adhesion_ratio = _adhesion_ratio_by_controller(equal_wear, dynamic_masses)
                if any(value > inputs.adhesion.mu_limit for value in adhesion_ratio.values()):
                    per_group[load_group] = equal_adhesion_distribution(dynamic_masses, total_force)
                    warnings.append(
                        WarningEntry(
                            code="allocation_strategy_auto_switched",
                            message=(
                                "Equal wear exceeded adhesion limit and was switched "
                                "to equal adhesion."
                            ),
                            context={
                                "brake_type": brake_type,
                                "load_group": load_group,
                                "original_strategy": inputs.allocation_strategy,
                                "applied_strategy": "equal_adhesion",
                                "mu_limit": inputs.adhesion.mu_limit,
                            },
                        )
                    )
                else:
                    per_group[load_group] = equal_wear
        forces[brake_type] = per_group
    return ctx.model_copy(update={"F_by_controller": forces, "warnings": warnings})
