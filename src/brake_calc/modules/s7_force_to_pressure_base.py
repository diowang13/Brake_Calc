"""基础压力换算模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.report import ClampEvent
from brake_calc.domain.calibration import resolve_brake_mode
from brake_calc.domain.pressure import clamp_value, force_to_pressure_kpa
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """用默认 k 与机械模型将制动力换算为基础压力。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s7")

    brake_type_definitions = {item.name: item for item in inputs.brake_types}
    base_pressures: dict[str, dict[str, dict[str, float]]] = {}
    clamp_events = list(ctx.clamp_events)
    for brake_type, per_group in ctx.F_by_controller.items():
        brake_type_def = brake_type_definitions[brake_type]
        brake_mode = resolve_brake_mode(brake_type_def.name, brake_type_def.source)
        default_k = inputs.k_config.default[brake_mode].k_const
        base_pressures[brake_type] = {}
        for load_group, per_controller in per_group.items():
            base_pressures[brake_type][load_group] = {}
            for controller, force in per_controller.items():
                pressure = force_to_pressure_kpa(
                    force,
                    default_k,
                    inputs.mech_params.mechanical_gain_by_controller[controller],
                )
                min_kpa = inputs.clamp_config.min_kpa_by_brake_type.get(brake_type, 0.0)
                max_kpa = inputs.clamp_config.max_kpa_by_brake_type.get(brake_type, pressure)
                clamped_pressure, was_clamped = clamp_value(pressure, min_kpa, max_kpa)
                if was_clamped:
                    clamp_events.append(
                        ClampEvent(
                            brake_type=brake_type,
                            load_group=load_group,
                            controller=controller,
                            kind="base_pressure",
                            value_before=pressure,
                            value_after=clamped_pressure,
                        )
                    )
                base_pressures[brake_type][load_group][controller] = clamped_pressure
    return ctx.model_copy(
        update={
            "BCP_base_by_controller": base_pressures,
            "clamp_events": clamp_events,
        }
    )
