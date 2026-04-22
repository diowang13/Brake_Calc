"""k(f) 标定模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import LoadGroup, PressureCalibrationEntry
from brake_calc.contracts.report import ClampEvent, WarningEntry
from brake_calc.domain.calibration import evaluate_k_curve, resolve_brake_mode
from brake_calc.domain.pressure import clamp_value, force_to_pressure_kpa
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def _resolve_curve_group(
    load_group: LoadGroup,
    brake_mode: str,
    calibrated: dict[LoadGroup, dict[str, PressureCalibrationEntry]],
    fallback: dict[LoadGroup, LoadGroup],
) -> tuple[LoadGroup, bool]:
    if load_group in calibrated and brake_mode in calibrated[load_group]:
        return load_group, False
    fallback_group = fallback.get(load_group, load_group)
    return fallback_group, fallback_group != load_group


def run(ctx: Context) -> Context:
    """按 load_group、brake mode 与控制器制动力应用压力标定。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s8")

    brake_type_definitions = {item.name: item for item in inputs.brake_types}
    warnings = list(ctx.warnings)
    k_used: dict[str, dict[str, dict[str, float]]] = {}
    bcp0_used: dict[str, dict[str, dict[str, float]]] = {}
    raw_pressures: dict[LoadGroup, dict[str, dict[str, float]]] = {
        group: {} for group in inputs.load_groups
    }

    for brake_type, per_group in ctx.F_by_controller.items():
        brake_type_def = brake_type_definitions[brake_type]
        brake_mode = resolve_brake_mode(brake_type_def.name, brake_type_def.source)
        k_used[brake_type] = {}
        bcp0_used[brake_type] = {}
        for load_group in inputs.load_groups:
            per_controller = per_group[load_group]
            entry: PressureCalibrationEntry | None = None
            if inputs.pressure_calibration.enabled:
                curve_group, used_fallback = _resolve_curve_group(
                    load_group,
                    brake_mode,
                    inputs.pressure_calibration.calibrated,
                    inputs.pressure_calibration.fallback,
                )
                if used_fallback:
                    warnings.append(
                        WarningEntry(
                            code="pressure_calibration_fallback",
                            message="Pressure calibration fallback applied.",
                            context={
                                "load_group": load_group,
                                "fallback_group": curve_group,
                                "brake_mode": brake_mode,
                            },
                        )
                    )
                entry = inputs.pressure_calibration.calibrated[curve_group][brake_mode]

            k_used[brake_type][load_group] = {}
            bcp0_used[brake_type][load_group] = {}
            raw_pressures[load_group].setdefault(brake_type, {})
            for controller, force in per_controller.items():
                if entry is None:
                    k_value = ctx.k_initial
                    bcp0_value = ctx.BCP0_initial
                else:
                    evaluated_k, out_of_range = evaluate_k_curve(entry, force)
                    bcp0_value = entry.BCP0
                    if evaluated_k is None:
                        k_value = ctx.k_initial
                    else:
                        k_value = evaluated_k
                    if out_of_range:
                        warnings.append(
                            WarningEntry(
                                code="pressure_calibration_out_of_range",
                                message="Target force is outside calibrated k(f) range.",
                                context={
                                    "brake_type": brake_type,
                                    "load_group": load_group,
                                    "controller": controller,
                                },
                            )
                        )

                k_used[brake_type][load_group][controller] = k_value
                bcp0_used[brake_type][load_group][controller] = bcp0_value
                raw_pressures[load_group][brake_type][controller] = force_to_pressure_kpa(
                    force,
                    k_value,
                    bcp0_value,
                )

    clamp_events = list(ctx.clamp_events)
    calibrated_pressures: dict[str, dict[str, dict[str, float]]] = {
        group: {} for group in inputs.load_groups
    }

    for load_group, per_brake_type in raw_pressures.items():
        if "EB" not in per_brake_type:
            continue
        calibrated_pressures[load_group].setdefault("EB", {})
        for controller, pressure in per_brake_type["EB"].items():
            clamped_pressure, was_clamped = clamp_value(pressure, inputs.EB_limit_min, 600.0)
            if was_clamped:
                clamp_events.append(
                    ClampEvent(
                        brake_type="EB",
                        load_group=load_group,
                        controller=controller,
                        kind="calibrated_pressure",
                        value_before=pressure,
                        value_after=clamped_pressure,
                    )
                )
            calibrated_pressures[load_group]["EB"][controller] = clamped_pressure

    for load_group, per_brake_type in raw_pressures.items():
        for brake_type, per_controller in per_brake_type.items():
            if brake_type == "EB":
                continue
            brake_type_def = brake_type_definitions[brake_type]
            brake_mode = resolve_brake_mode(brake_type_def.name, brake_type_def.source)
            calibrated_pressures[load_group].setdefault(brake_type, {})
            for controller, pressure in per_controller.items():
                min_kpa = 0.0
                max_kpa = pressure
                if brake_mode == "FSB":
                    max_kpa = calibrated_pressures[load_group].get("EB", {}).get(
                        controller,
                        pressure,
                    )

                clamped_pressure, was_clamped = clamp_value(pressure, min_kpa, max_kpa)
                if was_clamped:
                    clamp_events.append(
                        ClampEvent(
                            brake_type=brake_type,
                            load_group=load_group,
                            controller=controller,
                            kind="calibrated_pressure",
                            value_before=pressure,
                            value_after=clamped_pressure,
                        )
                    )
                calibrated_pressures[load_group][brake_type][controller] = clamped_pressure

    return ctx.model_copy(
        update={
            "k_used_by_controller": k_used,
            "BCP0_used_by_controller": bcp0_used,
            "BCP_calibrated_by_controller": calibrated_pressures,
            "warnings": warnings,
            "clamp_events": clamp_events,
        }
    )
