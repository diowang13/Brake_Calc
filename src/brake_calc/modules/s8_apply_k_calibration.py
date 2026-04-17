"""k(f) 标定模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import KCurve, LoadGroup
from brake_calc.contracts.report import ClampEvent, WarningEntry
from brake_calc.domain.calibration import evaluate_k_curve, resolve_brake_mode
from brake_calc.domain.pressure import clamp_value
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def _resolve_curve_group(
    load_group: LoadGroup,
    brake_mode: str,
    calibrated: dict[LoadGroup, dict[str, KCurve]],
    fallback: dict[LoadGroup, LoadGroup],
) -> tuple[LoadGroup, bool]:
    if load_group in calibrated and brake_mode in calibrated[load_group]:
        return load_group, False
    fallback_group = fallback.get(load_group, load_group)
    return fallback_group, fallback_group != load_group


def run(ctx: Context) -> Context:
    """按 load_group 与 brake mode 应用 k(f) 校准。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s8")

    brake_type_definitions = {item.name: item for item in inputs.brake_types}
    warnings = list(ctx.warnings)
    clamp_events = list(ctx.clamp_events)
    k_used: dict[str, dict[str, dict[str, float]]] = {}
    calibrated_pressures: dict[str, dict[str, dict[str, float]]] = {
        group: {} for group in inputs.load_groups
    }

    for brake_type, per_group in ctx.F_by_controller.items():
        brake_type_def = brake_type_definitions[brake_type]
        brake_mode = resolve_brake_mode(brake_type_def.name, brake_type_def.source)
        default_k = inputs.k_config.default[brake_mode].k_const
        k_used[brake_type] = {}
        for load_group in inputs.load_groups:
            per_controller = per_group[load_group]
            curve_group, used_fallback = _resolve_curve_group(
                load_group,
                brake_mode,
                inputs.k_config.calibrated,
                inputs.k_config.fallback,
            )
            if used_fallback:
                warnings.append(
                    WarningEntry(
                        code="k_fallback_aw2",
                        message="Calibration curve fallback applied.",
                        context={
                            "load_group": load_group,
                            "fallback_group": curve_group,
                            "brake_mode": brake_mode,
                        },
                    )
                )
            curve = inputs.k_config.calibrated[curve_group][brake_mode]
            k_used[brake_type][load_group] = {}
            calibrated_pressures[load_group].setdefault(brake_type, {})
            for controller, force in per_controller.items():
                k_value, out_of_range = evaluate_k_curve(curve, force)
                if k_value is None:
                    k_value = default_k
                if out_of_range:
                    warnings.append(
                        WarningEntry(
                            code="k_out_of_range",
                            message="Target force is outside calibrated k(f) range.",
                            context={
                                "brake_type": brake_type,
                                "load_group": load_group,
                                "controller": controller,
                            },
                        )
                    )
                base_pressure = ctx.BCP_base_by_controller[brake_type][load_group][controller]
                calibrated_pressure = base_pressure * (k_value / default_k)
                min_kpa = inputs.clamp_config.min_kpa_by_brake_type.get(brake_type, 0.0)
                max_kpa = inputs.clamp_config.max_kpa_by_brake_type.get(
                    brake_type,
                    calibrated_pressure,
                )
                clamped_pressure, was_clamped = clamp_value(calibrated_pressure, min_kpa, max_kpa)
                if was_clamped:
                    clamp_events.append(
                        ClampEvent(
                            brake_type=brake_type,
                            load_group=load_group,
                            controller=controller,
                            kind="calibrated_pressure",
                            value_before=calibrated_pressure,
                            value_after=clamped_pressure,
                        )
                    )
                k_used[brake_type][load_group][controller] = k_value
                calibrated_pressures[load_group][brake_type][controller] = clamped_pressure

    return ctx.model_copy(
        update={
            "k_used_by_controller": k_used,
            "BCP_calibrated_by_controller": calibrated_pressures,
            "warnings": warnings,
            "clamp_events": clamp_events,
        }
    )
