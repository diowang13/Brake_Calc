"""报表输出。"""

from __future__ import annotations

from typing import cast

import yaml

from brake_calc.contracts.report import Report


def dump_report_yaml(report: Report) -> str:
    """将 report 序列化为 YAML。"""
    return cast(
        str,
        yaml.safe_dump(report.model_dump(mode="json"), sort_keys=False, allow_unicode=True),
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
