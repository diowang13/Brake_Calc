"""汇总与检查模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.report import Report
from brake_calc.domain.calibration import build_point_pair_curve
from brake_calc.domain.parking_brake import evaluate_parking_brake_check
from brake_calc.domain.reporting import (
    derive_dynamic_mass_formula,
    round_bcp0_for_code,
    round_deceleration,
    round_distance_m,
    round_k_for_code,
    round_kpa,
    round_mass_ton,
    summarize_electric_brake,
    theoretical_speed_check,
)
from brake_calc.domain.mass import rotational_mass_factor_for_bogie_type
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


def _build_calibration_summary(ctx: Context) -> dict[str, object]:
    """构造标定曲线摘要，供结构化报告和 Markdown 展示。"""
    inputs = ctx.validated_inputs
    if inputs is None or not inputs.pressure_calibration.enabled:
        return {}

    summary: dict[str, object] = {}
    cases = {
        "service_brake": inputs.pressure_calibration.service_brake,
        "emergency_brake": inputs.pressure_calibration.emergency_brake,
    }
    for case_name, case in cases.items():
        low_point, high_point = build_point_pair_curve(case, ctx.F_by_controller)
        representative_brake_type = "EB" if case_name == "emergency_brake" else "FSB"
        representative_load_group = next(iter(ctx.BCP0_used_by_controller[representative_brake_type]))
        representative_controller = next(
            iter(ctx.BCP0_used_by_controller[representative_brake_type][representative_load_group])
        )
        final_bcp0 = ctx.BCP0_used_by_controller[representative_brake_type][representative_load_group][
            representative_controller
        ]
        low_force_kn = round(low_point[0], 3)
        high_force_kn = round(high_point[0], 3)
        low_k_value = round(low_point[1], 6)
        high_k_value = round(high_point[1], 6)
        if high_point[0] == low_point[0]:
            slope_for_code = 0.0
            intercept_for_code = round_k_for_code(low_point[1])
        else:
            slope_for_code = (
                round_k_for_code(high_point[1]) - round_k_for_code(low_point[1])
            ) / (high_point[0] - low_point[0])
            intercept_for_code = round_k_for_code(low_point[1]) - slope_for_code * low_point[0]
        curve_symbol = "k_sb" if case_name == "service_brake" else "k_eb"
        input_points_summary: list[dict[str, object]] = []
        for point in case.points:
            input_force = {
                "AW0": max,
                "AW3": min,
            }.get(point.load_group, lambda values: sum(values) / len(values))(
                ctx.F_by_controller[point.brake_type][point.load_group].values()
            )
            input_points_summary.append(
                {
                    "label": f"input_{point.load_group}",
                    "load_group": point.load_group,
                    "brake_type": point.brake_type,
                    "force_kN": round(input_force, 3),
                    "k_value": round(point.k_for_code / 100.0, 6),
                    "k_for_code": round_k_for_code(point.k_for_code / 100.0),
                }
            )
        summary[case_name] = {
            "BCP0": round_kpa(final_bcp0),
            "BCP0_for_code": round_bcp0_for_code(final_bcp0),
            "point_pair_mode": case.point_pair_mode,
            "input_points": input_points_summary,
            "curve_points": [
                {
                    "label": "curve_low",
                    "force_kN": low_force_kn,
                    "k_value": low_k_value,
                    "k_for_code": round_k_for_code(low_point[1]),
                },
                {
                    "label": "curve_high",
                    "force_kN": high_force_kn,
                    "k_value": high_k_value,
                    "k_for_code": round_k_for_code(high_point[1]),
                },
            ],
            "linear_formula_for_code": (
                f"{curve_symbol}_for_code(f) = "
                f"{slope_for_code:.6f} * f + {intercept_for_code:.6f}"
            ),
        }
    return summary


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
            theoretical_speed_checks["FSB"][str(speed)] = _round_speed_check(
                theoretical_speed_check(
                    speed_kmh=speed,
                    beta_target=ctx.Beta_list["FSB"],
                    brake_type="FSB",
                    t1=inputs.response_time.FSB.t1,
                    impulse_rate=inputs.response_time.FSB.impulse_rate,
                )
            )
    if "EB" in inputs.requirement:
        theoretical_speed_checks["EB"] = {}
        for speed in speed_values:
            theoretical_speed_checks["EB"][str(speed)] = _round_speed_check(
                theoretical_speed_check(
                    speed_kmh=speed,
                    beta_target=ctx.Beta_list["EB"],
                    brake_type="EB",
                    t1=inputs.response_time.EB.t1,
                    t2=inputs.response_time.EB.t2,
                )
            )
    if "FB" in ctx.Beta_list and inputs.response_time.FB is not None:
        theoretical_speed_checks["FB"] = {}
        for speed in speed_values:
            theoretical_speed_checks["FB"][str(speed)] = _round_speed_check(
                theoretical_speed_check(
                    speed_kmh=speed,
                    beta_target=ctx.Beta_list["FB"],
                    brake_type="FB",
                    t1=inputs.response_time.FB.t1,
                    impulse_rate=inputs.response_time.FB.impulse_rate,
                )
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
            rotational_mass_factor=rotational_mass_factor_for_bogie_type(bogie_type),
        )

    pressure_conversion: dict[str, dict[str, dict[str, dict[str, float | int]]]] = {}
    force_to_pressure_formula: dict[str, dict[str, dict[str, dict[str, float | str]]]] = {}
    for brake_type, per_group in ctx.k_used_by_controller.items():
        pressure_conversion[brake_type] = {}
        force_to_pressure_formula[brake_type] = {}
        for load_group, per_controller in per_group.items():
            pressure_conversion[brake_type][load_group] = {}
            force_to_pressure_formula[brake_type][load_group] = {}
            for controller, k_value in per_controller.items():
                bcp0_value = ctx.BCP0_used_by_controller[brake_type][load_group][controller]
                force_value = ctx.F_by_controller[brake_type][load_group][controller]
                pressure_conversion[brake_type][load_group][controller] = {
                    "k_used": k_value,
                    "k_used_for_code": round_k_for_code(k_value),
                    "BCP0_used": round_kpa(bcp0_value),
                    "BCP0_used_for_code": round_bcp0_for_code(bcp0_value),
                }
                force_to_pressure_formula[brake_type][load_group][controller] = {
                    "force_kN": round(force_value, 3),
                    "formula": (
                        f"BCP_by_controller_kPa = {k_value:.6g} * F_by_controller_kN + "
                        f"{bcp0_value:.6g}"
                    ),
                    "formula_with_force": (
                        f"BCP_by_controller_kPa = {k_value:.6g} * {force_value:.6g} + "
                        f"{bcp0_value:.6g}"
                    ),
                }

    parking_brake_check_result = None
    parking_brake_check_results_by_load_group: dict[str, object] = {}
    if inputs.parking_brake_check.enabled:
        configured_groups = list(inputs.parking_brake_check.environment.grade_by_load_group)
        for load_group in configured_groups:
            parking_brake_check_results_by_load_group[load_group] = evaluate_parking_brake_check(
                controller_type=inputs.controller_type,
                load_group=load_group,
                controller_masses=ctx.Mass_by_controller[load_group],
                parking_config=inputs.parking_brake_check,
                mech_params=inputs.mech_params,
            )
        first_load_group = configured_groups[0]
        parking_brake_check_result = parking_brake_check_results_by_load_group[first_load_group]

    electric_brake_summary = summarize_electric_brake(
        enabled=inputs.electric_brake.enabled,
        force_scope=inputs.electric_brake.force_scope,
        characteristic_points=inputs.electric_brake.characteristic_points,
    )
    auto_adjustments = getattr(ctx, "auto_adjustments", [])
    calibration_summary = _build_calibration_summary(ctx)

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
            "force_to_pressure_formula": force_to_pressure_formula,
            "pressure_conversion": pressure_conversion,
        },
        calibration_summary=calibration_summary,
        parking_brake_check_result=parking_brake_check_result,
        parking_brake_check_results_by_load_group=parking_brake_check_results_by_load_group,
        electric_brake_summary=electric_brake_summary,
        auto_adjustments=auto_adjustments,
        warnings=ctx.warnings,
        clamp_events=ctx.clamp_events,
        trace=ctx.trace,
        delta_BCP=delta_bcp,
    )
    return ctx.model_copy(update={"report": report})
