"""k(f) 标定模块。"""

from __future__ import annotations

import logging
from typing import cast

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs, LoadGroup, PressureCalibrationCase
from brake_calc.contracts.report import AutoAdjustmentEntry, ClampEvent, WarningEntry
from brake_calc.domain.calibration import (
    build_point_pair_curve,
    evaluate_point_pair_curve,
    resolve_calibration_case_name,
)
from brake_calc.domain.pressure import clamp_value, force_to_pressure_kpa
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def _resolve_case(inputs: Inputs, case_name: str) -> PressureCalibrationCase:
    """按名称读取标定组。"""
    return cast(PressureCalibrationCase, getattr(inputs.pressure_calibration, case_name))


def run(ctx: Context) -> Context:
    """按试验点驱动的 k(f) 曲线应用压力标定。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s8")

    brake_type_definitions = {item.name: item for item in inputs.brake_types}
    warnings = list(ctx.warnings)
    auto_adjustments = list(ctx.auto_adjustments)
    k_used: dict[str, dict[str, dict[str, float]]] = {}
    bcp0_used: dict[str, dict[str, dict[str, float]]] = {}
    raw_pressures: dict[str, dict[str, dict[str, float]]] = {
        group: {} for group in inputs.load_groups
    }

    for brake_type, per_group in ctx.F_by_controller.items():
        brake_type_def = brake_type_definitions[brake_type]
        case_name = resolve_calibration_case_name(brake_type_def.name, brake_type_def.source)
        entry = _resolve_case(inputs, case_name) if inputs.pressure_calibration.enabled else None
        curve_points = (
            build_point_pair_curve(entry, ctx.F_by_controller) if entry is not None else None
        )

        k_used[brake_type] = {}
        bcp0_used[brake_type] = {}
        for load_group in inputs.load_groups:
            k_used[brake_type][load_group] = {}
            bcp0_used[brake_type][load_group] = {}
            raw_pressures[load_group].setdefault(brake_type, {})
            for controller, force in per_group[load_group].items():
                if entry is None or curve_points is None:
                    k_value = ctx.k_initial
                    bcp0_value = ctx.BCP0_initial
                else:
                    k_value = evaluate_point_pair_curve(force, curve_points[0], curve_points[1])
                    bcp0_value = entry.BCP0

                k_used[brake_type][load_group][controller] = k_value
                bcp0_used[brake_type][load_group][controller] = bcp0_value
                raw_pressures[load_group][brake_type][controller] = force_to_pressure_kpa(
                    force,
                    k_value,
                    bcp0_value,
                )

    if "FB" in raw_pressures.get("AW0", {}):
        max_delta_pressure = 0.0
        affected_cases: list[dict[str, str | float]] = []
        for load_group in inputs.load_groups:
            eb_pressures = raw_pressures[load_group].get("EB", {})
            fb_pressures = raw_pressures[load_group].get("FB", {})
            for controller, fb_pressure in fb_pressures.items():
                eb_pressure = eb_pressures.get(controller)
                if eb_pressure is None or fb_pressure <= eb_pressure:
                    continue
                delta_pressure = fb_pressure - eb_pressure
                max_delta_pressure = max(max_delta_pressure, delta_pressure)
                affected_cases.append(
                    {
                        "load_group": load_group,
                        "controller": controller,
                        "delta_pressure": delta_pressure,
                    }
                )

        if max_delta_pressure > 0.0:
            original_bcp0_eb = (
                inputs.pressure_calibration.emergency_brake.BCP0
                if inputs.pressure_calibration.enabled
                else ctx.BCP0_initial
            )
            applied_bcp0_eb = original_bcp0_eb + max_delta_pressure
            for load_group in inputs.load_groups:
                for controller in raw_pressures[load_group].get("EB", {}):
                    raw_pressures[load_group]["EB"][controller] += max_delta_pressure
                    bcp0_used["EB"][load_group][controller] = applied_bcp0_eb

            warnings.append(
                WarningEntry(
                    code="fb_pressure_exceeded_eb",
                    message="FB pressure exceeded EB pressure and BCP0_EB was increased.",
                    context={
                        "delta_pressure": max_delta_pressure,
                        "affected_cases": len(affected_cases),
                    },
                )
            )
            auto_adjustments.append(
                AutoAdjustmentEntry(
                    code="fb_pressure_exceeded_eb",
                    message="FB pressure exceeded EB pressure and BCP0_EB was increased.",
                    original={"BCP0_EB": original_bcp0_eb},
                    applied={"BCP0_EB": applied_bcp0_eb},
                    context={"affected_cases": affected_cases},
                )
            )

    clamp_events = list(ctx.clamp_events)
    calibrated_pressures: dict[str, dict[str, dict[str, float]]] = {
        group: {} for group in inputs.load_groups
    }

    for raw_load_group, per_brake_type in raw_pressures.items():
        load_group = cast(LoadGroup, raw_load_group)
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

    for raw_load_group, per_brake_type in raw_pressures.items():
        load_group = cast(LoadGroup, raw_load_group)
        for brake_type, per_controller in per_brake_type.items():
            if brake_type == "EB":
                continue
            calibrated_pressures[load_group].setdefault(brake_type, {})
            for controller, pressure in per_controller.items():
                max_kpa = calibrated_pressures[load_group]["EB"].get(controller, pressure)
                clamped_pressure, was_clamped = clamp_value(pressure, 0.0, max_kpa)
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
            "auto_adjustments": auto_adjustments,
            "warnings": warnings,
            "clamp_events": clamp_events,
        }
    )
