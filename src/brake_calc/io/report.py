"""报表输出。"""

from __future__ import annotations

from typing import cast

import yaml

from brake_calc.contracts.report import Report


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


def dump_report_markdown(report: Report) -> str:
    """将 report 渲染为 Markdown。"""
    lines: list[str] = ["# Brake Calculation Report", ""]

    lines.extend(["## Brake Summary", ""])
    for brake_type, values in report.brake_summary.items():
        lines.append(f"- `{brake_type}`: beta = {values['beta']:.6g} m/s^2")
    lines.append("")

    lines.extend(["## Load Summary", ""])
    for load_group, load_controllers in report.load_summary.items():
        lines.extend([f"### {load_group}", ""])
        lines.append("| controller | mass_dynamic (ton) | spring_pressure (kPa) |")
        lines.append("| --- | ---: | ---: |")
        for controller, values in load_controllers.items():
            lines.append(
                f"| {controller} | {values['mass_dynamic']:.6g} | "
                f"{values['spring_pressure']:.6g} |"
            )
        lines.append("")

    lines.extend(["## Pressure Standards", ""])
    for load_group, per_brake_type in report.controller_pressure_standards.items():
        lines.extend([f"### {load_group}", ""])
        for brake_type, pressure_controllers in per_brake_type.items():
            lines.extend([f"#### {brake_type}", ""])
            lines.append("| controller | BCP (kPa) |")
            lines.append("| --- | ---: |")
            for controller, pressure in pressure_controllers.items():
                lines.append(f"| {controller} | {pressure:.6g} |")
            lines.append("")

    lines.extend(["## Theoretical Speed Checks", ""])
    for brake_type, per_speed in report.theoretical_speed_checks.items():
        lines.extend([f"### {brake_type}", ""])
        lines.append(
            "| speed (km/h) | requirement_a_mean (m/s^2) | distance (m) | "
            "beta_used (m/s^2) |"
        )
        lines.append("| ---: | ---: | ---: | ---: |")
        for speed, values in per_speed.items():
            lines.append(
                f"| {speed} | {values['requirement_a_mean']:.6g} | "
                f"{values['theoretical_distance_m']:.6g} | {values['beta_used']:.6g} |"
            )
        lines.append("")

    lines.extend(["## Controller Code Parameters", ""])
    dynamic_mass_formula = report.controller_code_params.get("dynamic_mass_formula", {})
    if isinstance(dynamic_mass_formula, dict):
        lines.extend(["### Dynamic Mass Formula", ""])
        for bogie_type, values in dynamic_mass_formula.items():
            if isinstance(values, dict):
                lines.append(f"- `{bogie_type}`: `{values['expression']}`")
        lines.append("")

    force_to_pressure_formula = report.controller_code_params.get("force_to_pressure_formula", {})
    if isinstance(force_to_pressure_formula, dict):
        lines.extend(["### Force To Pressure Formula", ""])
        lines.append(
            "| brake_type | load_group | controller | force_kN | formula | "
            "formula_with_force |"
        )
        lines.append("| --- | --- | --- | ---: | --- | --- |")
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
                        f"| {brake_type} | {load_group} | {controller} | "
                        f"{float(values['force_kN']):.6g} | {values['formula']} | "
                        f"{values['formula_with_force']} |"
                    )
        lines.append("")

    pressure_conversion = report.controller_code_params.get("pressure_conversion", {})
    if isinstance(pressure_conversion, dict):
        lines.extend(["### Pressure Conversion", ""])
        lines.append(
            "| brake_type | load_group | controller | k_used | k_code | BCP0 | "
            "BCP0_code |"
        )
        lines.append("| --- | --- | --- | ---: | ---: | ---: | ---: |")
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
                        f"| {brake_type} | {load_group} | {controller} | "
                        f"{float(values['k_used']):.6g} | {int(values['k_used_for_code'])} | "
                        f"{float(values['BCP0_used']):.6g} | "
                        f"{int(values['BCP0_used_for_code'])} |"
                    )
        lines.append("")

    if report.calibration_summary:
        lines.extend(["## Calibration Summary", ""])
        for case_name, case_values in report.calibration_summary.items():
            if not isinstance(case_values, dict):
                continue
            lines.extend([f"### {case_name}", ""])
            lines.append(f"- point_pair_mode: {case_values.get('point_pair_mode')}")
            lines.append(f"- BCP0: {case_values.get('BCP0')}")
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
                        f"{point.get('k_for_code')} |"
                    )
                lines.append("")

            curve_points: object = case_values.get("curve_points", [])
            if isinstance(curve_points, list) and len(curve_points) >= 2:
                lines.append("| point | force_kN | k_value | k_for_code |")
                lines.append("| --- | ---: | ---: | ---: |")
                x_axis: list[str] = []
                y_axis: list[str] = []
                for point in curve_points:
                    if not isinstance(point, dict):
                        continue
                    lines.append(
                        f"| {point.get('label')} | {point.get('force_kN')} | "
                        f"{point.get('k_value')} | {point.get('k_for_code')} |"
                    )
                    x_axis.append(str(point.get("force_kN")))
                    y_axis.append(str(point.get("k_for_code")))
                lines.append("")
                chart_title = "k_sb(f)" if case_name == "service_brake" else "k_eb(f)"
                lines.extend(
                    [
                        "```mermaid",
                        "xychart-beta",
                        f'    title "{chart_title}"',
                        '    x-axis "Force (kN)" [' + ", ".join(x_axis) + "]",
                        '    y-axis "k_for_code" 0 --> '
                        + str(max(int(value) for value in y_axis)),
                        "    line [" + ", ".join(y_axis) + "]",
                        "```",
                        "",
                    ]
                )

    if report.parking_brake_check_result is not None:
        lines.extend(["## Parking Brake Check", ""])
        lines.append("| car | F_N_PB | F_PB | incline_force | safety_margin |")
        lines.append("| --- | ---: | ---: | ---: | ---: |")
        for car, per_car_result in report.parking_brake_check_result.per_car.items():
            lines.append(
                f"| {car} | {per_car_result.F_N_PB:.6g} | {per_car_result.F_PB:.6g} | "
                f"{per_car_result.incline_force:.6g} | {per_car_result.safety_margin:.6g} |"
            )
        lines.append("")
        lines.extend(["### whole_train", ""])
        lines.append("| F_PB | incline_force | safety_margin | pass |")
        lines.append("| ---: | ---: | ---: | --- |")
        lines.append(
            "| "
            f"{report.parking_brake_check_result.whole_train.F_PB:.6g} | "
            f"{report.parking_brake_check_result.whole_train.incline_force:.6g} | "
            f"{report.parking_brake_check_result.whole_train.safety_margin:.6g} | "
            f"{report.parking_brake_check_result.pass_} |"
        )
        lines.append("")

    if report.electric_brake_summary is not None:
        lines.extend(["## Electric Brake Summary", ""])
        lines.append(f"- enabled: {report.electric_brake_summary.enabled}")
        lines.append(f"- force_scope: {report.electric_brake_summary.force_scope}")
        lines.append("")

    if report.delta_BCP:
        lines.extend(["## delta_BCP", ""])
        for load_group, per_brake_type in report.delta_BCP.items():
            lines.extend([f"### {load_group}", ""])
            for brake_type, delta_controllers in per_brake_type.items():
                lines.extend([f"#### {brake_type}", ""])
                lines.append("| controller | delta_BCP (kPa) |")
                lines.append("| --- | ---: |")
                for controller, delta_value in delta_controllers.items():
                    lines.append(f"| {controller} | {delta_value:.6g} |")
                lines.append("")

    if report.auto_adjustments:
        lines.extend(["## Auto Adjustments", ""])
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
