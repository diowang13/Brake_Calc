"""动态载荷与质量模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.domain.mass import calc_dynamic_mass
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """按载荷组和控制器计算静态与动态质量。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s4")

    mass_by_controller: dict[str, dict[str, dict[str, float]]] = {}
    for load_group in inputs.load_groups:
        per_controller: dict[str, dict[str, float]] = {}
        for controller in inputs.vehicle_config.controllers:
            params = inputs.mass_params.controllers[controller.name]
            static_mass = params.mass_static_kg[load_group]
            per_controller[controller.name] = {
                "mass_static": static_mass,
                "mass_dynamic": calc_dynamic_mass(static_mass, params.rotational_mass_factor),
            }
        mass_by_controller[load_group] = per_controller
    return ctx.model_copy(update={"Mass_by_controller": mass_by_controller})
