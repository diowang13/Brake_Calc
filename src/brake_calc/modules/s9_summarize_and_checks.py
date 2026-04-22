"""汇总与检查模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.report import Report
from brake_calc.domain.reporting import (
    derive_dynamic_mass_formula,
    round_bcp0_for_code,
    round_deceleration,
    round_distance_m,
    round_k_for_code,
    round_kpa,
    round_mass_ton,
    theoretical_speed_check,
)
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def _round_pressure_matrix(
    matrix: dict[str, dict[str, dict[str, float]]],
) -> dict[str, dict[str, dict[str, float]]]:
    return {
        load_group: {
            brake_type: {
                controller: round_kpa(pressure)
                for controller, pressure in per_controller.items()
            }
            for brake_type, per_controller in per_brake_type.items()
        }
        for load_group, per_brake_type in matrix.items()
    }


def _round_speed_check(values: dict[str, float]) -> dict[str, float]:
    return {
        "requirement_a_mean": round_deceleration(values["requirement_a_mean"]),
        "theoretical_distance_m": round_distance_m(values["theoretical_distance_m"]),
        "beta_used": round_deceleration(values["beta_used"]),
    }


def run(ctx: Context) -> Context:
    """汇总最终 report。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s9")

    delta_bcp: dict[str, dict[str, dict[str, float]]] = {}
    for load_group, per_brake_type in ctx.BCP_calibrated_by_controller.items():
        delta_bcp[load_group] = {}
        for brake_type, per_controller in per_brake_type.items():
            delta_bcp[load_group][brake_type] = {}
            for controller, calibrated in per_controller.items():
                base = ctx.BCP_base_by_controller[brake_type][load_group][controller]
                delta_bcp[load_group][brake_type][controller] = round_kpa(calibrated - base)

    brake_summary = {
        brake_type: {"beta": round_deceleration(beta)} for brake_type, beta in ctx.Beta_list.items()
    }
    load_summary: dict[str, dict[str, dict[str, float]]] = {}
    for load_group, mass_controllers in ctx.Mass_by_controller.items():
        load_summary[load_group] = {}
        for controller, mass_values in mass_controllers.items():
            load_summary[load_group][controller] = {
                "mass_dynamic": round_mass_ton(mass_values["mass_dynamic"]),
                "spring_pressure": round_kpa(
                    ctx.AirSpringPressure_by_controller[load_group][controller]
                ),
            }

    speed_values = inputs.V_list if inputs.V_list is not None else [inputs.v0]
    theoretical_speed_checks: dict[str, dict[str, dict[str, float]]] = {}
    if "FSB" in inputs.requirement:
        theoretical_speed_checks["FSB"] = {}
        for speed in speed_values:
            theoretical_speed_checks["FSB"][str(speed)] = theoretical_speed_check(
                speed_kmh=speed,
                beta_target=ctx.Beta_list["FSB"],
                brake_type="FSB",
                t1=inputs.response_time.FSB.t1,
                impulse_rate=inputs.response_time.FSB.impulse_rate,
            )
            theoretical_speed_checks["FSB"][str(speed)] = _round_speed_check(
                theoretical_speed_checks["FSB"][str(speed)]
            )
    if "EB" in inputs.requirement:
        theoretical_speed_checks["EB"] = {}
        for speed in speed_values:
            theoretical_speed_checks["EB"][str(speed)] = theoretical_speed_check(
                speed_kmh=speed,
                beta_target=ctx.Beta_list["EB"],
                brake_type="EB",
                t1=inputs.response_time.EB.t1,
                t2=inputs.response_time.EB.t2,
            )
            theoretical_speed_checks["EB"][str(speed)] = _round_speed_check(
                theoretical_speed_checks["EB"][str(speed)]
            )

    dynamic_mass_formula: dict[str, dict[str, float | str]] = {}
    for bogie_type in ("powered_bogie", "trailer_bogie"):
        fit = ctx.AirSpringFit_by_bogie_type[bogie_type]
        params = getattr(inputs.mass_params, bogie_type)
        dynamic_mass_formula[bogie_type] = derive_dynamic_mass_formula(
            airspring_k=float(fit["k"]),
            airspring_b=float(fit["b"]),
            n_springs_by_controller=inputs.n_springs_by_controller,
            bogie_weight=params.bogie_weight,
            aw0_static_mass=params.mass_static["AW0"],
            rotational_mass_factor=params.rotational_mass_factor,
        )

    pressure_conversion: dict[str, dict[str, dict[str, dict[str, float | int]]]] = {}
    for brake_type, per_group in ctx.k_used_by_controller.items():
        pressure_conversion[brake_type] = {}
        for load_group, per_controller in per_group.items():
            pressure_conversion[brake_type][load_group] = {}
            for controller, k_value in per_controller.items():
                bcp0_value = ctx.BCP0_used_by_controller[brake_type][load_group][controller]
                pressure_conversion[brake_type][load_group][controller] = {
                    "k_used": k_value,
                    "k_used_for_code": round_k_for_code(k_value),
                    "BCP0_used": round_kpa(bcp0_value),
                    "BCP0_used_for_code": round_bcp0_for_code(bcp0_value),
                }

    rounded_pressure_standards = _round_pressure_matrix(ctx.BCP_calibrated_by_controller)
    report = Report(
        pressure_standards=rounded_pressure_standards,
        BCP_calibrated_by_controller=rounded_pressure_standards,
        brake_summary=brake_summary,
        load_summary=load_summary,
        controller_pressure_standards=rounded_pressure_standards,
        theoretical_speed_checks=theoretical_speed_checks,
        controller_code_params={
            "dynamic_mass_formula": dynamic_mass_formula,
            "pressure_conversion": pressure_conversion,
        },
        warnings=ctx.warnings,
        clamp_events=ctx.clamp_events,
        trace=ctx.trace,
        delta_BCP=delta_bcp,
    )
    return ctx.model_copy(update={"report": report})
