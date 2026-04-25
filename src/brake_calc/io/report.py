"""报表输出。"""

from __future__ import annotations

from typing import cast

import yaml

from brake_calc.contracts.report import Report
from brake_calc.domain.reporting import round_bcp0_for_code


def dump_report_yaml(report: Report) -> str:
    """将 report 序列化为 YAML。"""
    return cast(
        str,
        yaml.safe_dump(
            report.model_dump(mode="json", by_alias=True),
            sort_keys=False,
            allow_unicode=True,
        ),
    )


def _format_pressure(value: object) -> str:
    return str(int(round(float(value))))


def _format_mass(value: object) -> str:
    return f"{float(value):.2f}"


def _format_deceleration(value: object) -> str:
    return f"{float(value):.3f}"


def _format_force(value: object) -> str:
    return f"{float(value):.3f}"


def _format_ratio(value: object) -> str:
    return f"{float(value):.3f}"


def _format_force_axis(value: object) -> str:
    force = float(value)
    return str(int(force)) if force.is_integer() else f"{force:.3f}".rstrip("0").rstrip(".")


def _collect_brake_types(report: Report) -> list[str]:
    brake_types: list[str] = []
    for per_brake_type in report.controller_pressure_standards.values():
        for brake_type in per_brake_type:
            if brake_type not in brake_types:
                brake_types.append(brake_type)
    return brake_types


def _build_piecewise_lines(case_name: str, case_values: dict[str, object]) -> list[str]:
    curve_points = case_values.get("curve_points", [])
    if not isinstance(curve_points, list) or len(curve_points) < 2:
        return []

    low_point = curve_points[0]
    high_point = curve_points[1]
    if not isinstance(low_point, dict) or not isinstance(high_point, dict):
        return []

    symbol = "k_sb" if case_name == "service_brake" else "k_eb"
    low_force = _format_force_axis(low_point["force_kN"])
    high_force = _format_force_axis(high_point["force_kN"])
    low_code = str(int(low_point["k_for_code"]))
    high_code = str(int(high_point["k_for_code"]))
    linear_formula = case_values.get("linear_formula_for_code", "")
    if not isinstance(linear_formula, str) or not linear_formula:
        force_span = float(high_point["force_kN"]) - float(low_point["force_kN"])
        if force_span == 0:
            slope = 0.0
        else:
            slope = (int(high_point["k_for_code"]) - int(low_point["k_for_code"])) / force_span
        intercept = int(low_point["k_for_code"]) - slope * float(low_point["force_kN"])
        formula_prefix = f"{symbol}_for_code(f) = "
        linear_formula = f"{formula_prefix}{slope:.6f} * f + {intercept:.6f}"

    return [
        f"{symbol}(f) for controller code:",
        "```text",
        f"{low_code:<25} if f <= {low_force}",
        f"{linear_formula.replace(f'{symbol}_for_code(f) = ', ''):<25} if {low_force} < f < {high_force}",
        f"{high_code:<25} if f >= {high_force}",
        "```",
    ]


def _resolve_linear_formula_for_code(case_name: str, case_values: dict[str, object]) -> str | None:
    linear_formula = case_values.get("linear_formula_for_code")
    if isinstance(linear_formula, str) and linear_formula:
        return linear_formula

    curve_points = case_values.get("curve_points", [])
    if not isinstance(curve_points, list) or len(curve_points) < 2:
        return None
    low_point = curve_points[0]
    high_point = curve_points[1]
    if not isinstance(low_point, dict) or not isinstance(high_point, dict):
        return None

    force_span = float(high_point["force_kN"]) - float(low_point["force_kN"])
    slope = 0.0 if force_span == 0 else (
        (int(high_point["k_for_code"]) - int(low_point["k_for_code"])) / force_span
    )
    intercept = int(low_point["k_for_code"]) - slope * float(low_point["force_kN"])
    symbol = "k_sb" if case_name == "service_brake" else "k_eb"
    return f"{symbol}_for_code(f) = {slope:.6f} * f + {intercept:.6f}"


def _build_curve_chart(case_name: str, case_values: dict[str, object]) -> list[str]:
    curve_points = case_values.get("curve_points", [])
    if not isinstance(curve_points, list) or len(curve_points) < 2:
        return []

    low_point = curve_points[0]
    high_point = curve_points[1]
    if not isinstance(low_point, dict) or not isinstance(high_point, dict):
        return []

    low_force = _format_force_axis(low_point["force_kN"])
    high_force = _format_force_axis(high_point["force_kN"])
    low_code = int(low_point["k_for_code"])
    high_code = int(high_point["k_for_code"])
    ymin_value = min(low_code, high_code)
    ymax_value = max(low_code, high_code)
    y_span = max(ymax_value - ymin_value, 1)
    y_padding = max(int(round(y_span * 0.2)), 10)
    ymin = ymin_value - y_padding
    ymax = ymax_value + y_padding
    low_force_value = float(low_point["force_kN"])
    high_force_value = float(high_point["force_kN"])
    span = max(high_force_value - low_force_value, 1.0)
    padding = span * 0.2
    chart_min = _format_force_axis(low_force_value - padding)
    chart_max = _format_force_axis(high_force_value + padding)

    return [
        "```mermaid",
        "xychart-beta",
        f'    title "{case_name} k_for_code(f)"',
        f'    x-axis "f (kN)" [{chart_min}, {low_force}, {high_force}, {chart_max}]',
        f'    y-axis "k_for_code" {ymin} --> {ymax}',
        f"    line [{low_code}, {low_code}, {high_code}, {high_code}]",
        "```",
    ]


def dump_report_markdown(report: Report) -> str:
    """将 report 渲染为 Markdown。"""
    lines: list[str] = ["# Brake Calculation Report", ""]
    lines.extend(["## Summary", ""])
    if report.brake_summary:
        lines.append("| brake_type | beta (m/s^2) |")
        lines.append("| --- | ---: |")
        for brake_type, values in report.brake_summary.items():
            lines.append(f"| {brake_type} | {_format_deceleration(values['beta'])} |")
        lines.append("")

    if report.auto_adjustments:
        lines.append("Auto adjustments:")
        for item in report.auto_adjustments:
            lines.append(f"- `{item.code}`: {item.message}")
            if item.original:
                original_parts = [f"{key}={value}" for key, value in item.original.items()]
                lines.append(f"  original: {', '.join(original_parts)}")
            if item.applied:
                applied_parts = [f"{key}={value}" for key, value in item.applied.items()]
                lines.append(f"  applied: {', '.join(applied_parts)}")
            if item.context:
                context_parts = [f"{key}={value}" for key, value in item.context.items()]
                lines.append(f"  context: {', '.join(context_parts)}")
        lines.append("")

    lines.extend(["## Key Tables", ""])
    brake_types = _collect_brake_types(report)
    lines.extend(
        [
            "### Pressure / Dynamic Load Matrix",
            "",
            "Columns: `mass_dyn_t` = dynamic mass (ton), `spring_kPa` = air spring pressure (kPa), brake columns = BCP standard (kPa).",
            "",
        ]
    )
    header = ["case", "mass_dyn_t", "spring_kPa", *brake_types]
    lines.append("| " + " | ".join(header) + " |")
    lines.append("| " + " | ".join(["---", "---:", "---:", *(["---:"] * len(brake_types))]) + " |")
    for load_group, load_controllers in report.load_summary.items():
        pressure_rows = report.controller_pressure_standards.get(load_group, {})
        for controller, values in load_controllers.items():
            row = [
                f"{load_group} / {controller}",
                _format_mass(values["mass_dynamic"]),
                _format_pressure(values["spring_pressure"]),
            ]
            for brake_type in brake_types:
                pressure = pressure_rows.get(brake_type, {}).get(controller)
                row.append("" if pressure is None else _format_pressure(pressure))
            lines.append("| " + " | ".join(row) + " |")
    lines.append("")

    lines.extend(["## Checks", ""])
    if report.theoretical_speed_checks:
        lines.extend(["### Theoretical Speed Checks", ""])
        lines.append("| brake_type | speed_kmh | req_a_mean | distance_m | beta_used |")
        lines.append("| --- | ---: | ---: | ---: | ---: |")
        for brake_type, per_speed in report.theoretical_speed_checks.items():
            for speed, values in per_speed.items():
                lines.append(
                    "| "
                    f"{brake_type} | {speed} | "
                    f"{_format_deceleration(values['requirement_a_mean'])} | "
                    f"{_format_pressure(values['theoretical_distance_m'])} | "
                    f"{_format_deceleration(values['beta_used'])} |"
                )
        lines.append("")

    if report.parking_brake_check_result is not None:
        lines.extend(["### Parking Brake Check", ""])
        lines.append("- `F_N_PB = parking brake normal force per brake unit (both sides, kN)`")
        lines.append("- `F_PB = parking brake braking force per car (kN)`")
        lines.append("- `F_PB = brake_geometry_factor * F_N_PB * Np * xi0`")
        lines.append("- `brake_geometry_factor = 1 (tread) or 2 * Rf / Dw (caliper)`")
        lines.append("- `incline_force = resisting force per car on grade + wind (kN)`")
        lines.append("- `safety_margin = F_PB / incline_force (-)`")
        lines.append("")
        grouped_results = report.parking_brake_check_results_by_load_group
        if not grouped_results and report.parking_brake_check_result is not None:
            grouped_results = {"AW0": report.parking_brake_check_result}

        lines.append("| case | F_N_PB | F_PB | incline_force | safety_margin | whole_train_F_PB | whole_train_incline | pass |")
        lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
        for load_group, parking_result in grouped_results.items():
            for car, per_car_result in parking_result.per_car.items():
                lines.append(
                    "| "
                    f"{load_group} / {car} | "
                    f"{_format_force(per_car_result.F_N_PB)} | "
                    f"{_format_force(per_car_result.F_PB)} | "
                    f"{_format_force(per_car_result.incline_force)} | "
                    f"{_format_ratio(per_car_result.safety_margin)} | "
                    f"{_format_force(parking_result.whole_train.F_PB)} | "
                    f"{_format_force(parking_result.whole_train.incline_force)} | "
                    f"{parking_result.pass_} |"
                )
        lines.append("")

    if report.electric_brake_summary is not None:
        lines.extend(["### Electric Brake Summary", ""])
        lines.append(f"- enabled: {report.electric_brake_summary.enabled}")
        lines.append(f"- force_scope: {report.electric_brake_summary.force_scope}")
        lines.append("")

    lines.extend(["## Controller Development Parameters", ""])
    if report.calibration_summary:
        lines.extend(["### Calibration Summary", ""])
        for case_name, case_values in report.calibration_summary.items():
            if not isinstance(case_values, dict):
                continue
            lines.extend([f"#### {case_name}", ""])
            lines.append(f"- point_pair_mode: `{case_values.get('point_pair_mode')}`")
            lines.append(
                f"- BCP0: {_format_pressure(case_values.get('BCP0', 0.0))} kPa"
            )
            bcp0_for_code = case_values.get("BCP0_for_code")
            if not isinstance(bcp0_for_code, int):
                bcp0_for_code = round_bcp0_for_code(float(case_values.get("BCP0", 0.0)))
            lines.append(f"- BCP0_for_code = {bcp0_for_code}")
            linear_formula = _resolve_linear_formula_for_code(case_name, case_values)
            if linear_formula is not None:
                lines.append(f"- {linear_formula}")
            lines.append("")

            input_points: object = case_values.get("input_points", [])
            if isinstance(input_points, list) and input_points:
                lines.append("| load_group | brake_type | k_for_code |")
                lines.append("| --- | --- | ---: |")
                for point in input_points:
                    if not isinstance(point, dict):
                        continue
                    lines.append(
                        f"| {point.get('load_group')} | {point.get('brake_type')} | "
                        f"{int(point.get('k_for_code', 0))} |"
                    )
                lines.append("")

            curve_points: object = case_values.get("curve_points", [])
            combined_points: list[dict[str, object]] = []
            if isinstance(input_points, list):
                combined_points.extend(
                    [point for point in input_points if isinstance(point, dict) and "force_kN" in point]
                )
            if isinstance(curve_points, list):
                combined_points.extend([point for point in curve_points if isinstance(point, dict)])
            if combined_points:
                lines.append("| point | force_kN | k_value | k_for_code |")
                lines.append("| --- | ---: | ---: | ---: |")
                for point in combined_points:
                    lines.append(
                        f"| {point.get('label')} | {_format_force(point.get('force_kN', 0.0))} | "
                        f"{float(point.get('k_value', 0.0)):.6f} | "
                        f"{int(point.get('k_for_code', 0))} |"
                    )
                lines.append("")
            if isinstance(curve_points, list) and len(curve_points) >= 2:
                lines.extend(_build_piecewise_lines(case_name, case_values))
                lines.extend(_build_curve_chart(case_name, case_values))
                lines.append("")

    dynamic_mass_formula = report.controller_code_params.get("dynamic_mass_formula", {})
    if isinstance(dynamic_mass_formula, dict):
        lines.extend(["### Dynamic Mass Formula", ""])
        for bogie_type, values in dynamic_mass_formula.items():
            if isinstance(values, dict):
                lines.append(f"- `{bogie_type}`: `{values['expression']}`")
        lines.append("")

    pressure_conversion = report.controller_code_params.get("pressure_conversion", {})
    if isinstance(pressure_conversion, dict):
        lines.extend(["### Pressure Conversion", ""])
        lines.append("| brake_type | case | k_used | k_code | BCP0 | BCP0_code |")
        lines.append("| --- | --- | ---: | ---: | ---: | ---: |")
        for brake_type, per_group in pressure_conversion.items():
            if not isinstance(per_group, dict):
                continue
            for load_group, per_controller in per_group.items():
                if not isinstance(per_controller, dict):
                    continue
                for controller, values in per_controller.items():
                    if not isinstance(values, dict):
                        continue
                    lines.append(
                        "| "
                        f"{brake_type} | {load_group} / {controller} | "
                        f"{float(values['k_used']):.6f} | {int(values['k_used_for_code'])} | "
                        f"{_format_pressure(values['BCP0_used'])} | "
                        f"{int(values['BCP0_used_for_code'])} |"
                    )
        lines.append("")

    force_to_pressure_formula = report.controller_code_params.get("force_to_pressure_formula", {})
    if isinstance(force_to_pressure_formula, dict):
        lines.extend(["### Force To Pressure Formula", ""])
        lines.append("| brake_type | case | force_kN | formula | formula_with_force |")
        lines.append("| --- | --- | ---: | --- | --- |")
        for brake_type, per_group in force_to_pressure_formula.items():
            if not isinstance(per_group, dict):
                continue
            for load_group, per_controller in per_group.items():
                if not isinstance(per_controller, dict):
                    continue
                for controller, values in per_controller.items():
                    if not isinstance(values, dict):
                        continue
                    lines.append(
                        "| "
                        f"{brake_type} | {load_group} / {controller} | "
                        f"{_format_force(values['force_kN'])} | {values['formula']} | "
                        f"{values['formula_with_force']} |"
                    )
        lines.append("")

    if report.warnings:
        lines.extend(["## Warnings", ""])
        for warning in report.warnings:
            lines.append(f"- `{warning.code}`: {warning.message}")
        lines.append("")

    if report.clamp_events:
        lines.extend(["## Clamp Events", ""])
        for event in report.clamp_events:
            lines.append(
                f"- {event.load_group}/{event.brake_type}/{event.controller}: "
                f"{event.value_before:.6g} -> {event.value_after:.6g}"
            )
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"
