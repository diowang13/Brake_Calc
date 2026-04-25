from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from brake_calc.contracts.report import Report
from brake_calc.io.report import dump_report_markdown, dump_report_yaml


def test_dump_report_markdown_renders_core_sections() -> None:
    report = Report(
        pressure_standards={"AW0": {"FSB": {"bogie_1": 123.0}}},
        BCP_calibrated_by_controller={"AW0": {"FSB": {"bogie_1": 123.0}}},
        brake_summary={"FSB": {"beta": 1.1}},
        load_summary={"AW0": {"bogie_1": {"mass_dynamic": 10.8, "spring_pressure": 250.0}}},
        controller_pressure_standards={"AW0": {"FSB": {"bogie_1": 123.0}}},
        theoretical_speed_checks={
            "FSB": {
                "40.0": {
                    "requirement_a_mean": 1.001,
                    "theoretical_distance_m": 62.0,
                    "beta_used": 1.1,
                }
            }
        },
        controller_code_params={
            "dynamic_mass_formula": {
                "powered_bogie": {
                    "expression": "mass_dynamic_ton = 0.1 * spring_pressure_kpa + -7.2"
                }
            },
            "force_to_pressure_formula": {
                "FSB": {
                    "AW0": {
                        "bogie_1": {
                            "force_kN": 9.1,
                            "formula": "BCP_by_controller_kPa = 10.757 * F_by_controller_kN + 21.0",
                            "formula_with_force": "BCP_by_controller_kPa = 10.757 * 9.1 + 21.0",
                        }
                    }
                }
            },
            "pressure_conversion": {
                "FSB": {
                    "AW0": {
                        "bogie_1": {
                            "k_used": 10.757,
                            "k_used_for_code": 1076,
                            "BCP0_used": 21.0,
                            "BCP0_used_for_code": 25,
                        }
                    }
                }
            },
        },
        calibration_summary={
            "service_brake": {
                "point_pair_mode": "aw3_aw0",
                "BCP0": 25.0,
                "input_points": [
                    {
                        "label": "input_AW0",
                        "load_group": "AW0",
                        "brake_type": "FB",
                        "force_kN": 15.0,
                        "k_value": 9.81,
                        "k_for_code": 981,
                    },
                    {
                        "label": "input_AW3",
                        "load_group": "AW3",
                        "brake_type": "FSB",
                        "force_kN": 33.0,
                        "k_value": 11.23,
                        "k_for_code": 1123,
                    },
                ],
                "curve_points": [
                    {
                        "label": "curve_low",
                        "force_kN": 15.0,
                        "k_value": 9.81,
                        "k_for_code": 981,
                    },
                    {
                        "label": "curve_high",
                        "force_kN": 33.0,
                        "k_value": 11.23,
                        "k_for_code": 1123,
                    },
                ],
            }
        },
        parking_brake_check_result={
            "per_car": {
                "car_1": {
                    "F_N_PB": 15.0,
                    "F_PB": 5.3,
                    "incline_force": 8.6,
                    "safety_margin": 0.62,
                }
            },
            "whole_train": {
                "F_PB": 10.6,
                "incline_force": 16.5,
                "safety_margin": 0.64,
            },
            "pass": False,
        },
        parking_brake_check_results_by_load_group={
            "AW0": {
                "per_car": {
                    "car_1": {
                        "F_N_PB": 15.0,
                        "F_PB": 5.3,
                        "incline_force": 8.6,
                        "safety_margin": 0.62,
                    }
                },
                "whole_train": {
                    "F_PB": 10.6,
                    "incline_force": 16.5,
                    "safety_margin": 0.64,
                },
                "pass": False,
            },
            "AW3": {
                "per_car": {
                    "car_1": {
                        "F_N_PB": 15.0,
                        "F_PB": 5.3,
                        "incline_force": 9.1,
                        "safety_margin": 0.58,
                    }
                },
                "whole_train": {
                    "F_PB": 10.6,
                    "incline_force": 17.4,
                    "safety_margin": 0.61,
                },
                "pass": False,
            },
        },
        electric_brake_summary={
            "enabled": True,
            "force_scope": "train_total",
            "preview_head": [{"speed_kmh": 0.0, "force_kN": 0.0}],
            "preview_tail": [{"speed_kmh": 80.0, "force_kN": 0.0}],
        },
        auto_adjustments=[
            {
                "code": "fb_pressure_exceeded_eb",
                "message": "FB pressure exceeded EB pressure and BCP0_EB was increased.",
                "original": {"BCP0_EB": 25.0},
                "applied": {"BCP0_EB": 29.56},
                "context": {
                    "load_group": "AW0",
                    "controller": "bogie_1",
                    "delta_pressure": 4.56,
                },
            }
        ],
        delta_BCP={"AW0": {"FSB": {"bogie_1": 5.0}}},
    )

    markdown = dump_report_markdown(report)

    assert "# Brake Calculation Report" in markdown
    assert "## Summary" in markdown
    assert "## Key Tables" in markdown
    assert "## Checks" in markdown
    assert "## Controller Development Parameters" in markdown
    assert "### Pressure / Dynamic Load Matrix" in markdown
    assert "### Calibration Summary" in markdown
    assert "### Parking Brake Check" in markdown
    assert "### Pressure Conversion" in markdown
    assert "### Force To Pressure Formula" in markdown
    assert "AW0 / bogie_1" in markdown
    assert "AW3 / car_1" in markdown
    assert "beta_used" in markdown
    assert "k_sb(f)" in markdown
    assert "981                       if f <= 15" in markdown
    assert "k_sb_for_code(f) = 7.888889 * f + 862.666667" in markdown
    assert "BCP0_for_code = 25" in markdown
    assert "xychart-beta" in markdown
    assert 'title "service_brake k_for_code(f)"' in markdown
    assert 'x-axis "f (kN)" [11.4, 15, 33, 36.6]' in markdown
    assert 'y-axis "k_for_code" 953 --> 1151' in markdown
    assert 'line [981, 981, 1123, 1123]' in markdown
    assert "| input_AW0 | 15.000 | 9.810000 | 981 |" in markdown
    assert "| input_AW0 | 15.000 | 9.810000 | 981 |" in markdown
    assert "| curve_low | 15.000 | 9.810000 | 981 |" in markdown
    assert "| curve_high | 33.000 | 11.230000 | 1123 |" in markdown
    assert "mass_dynamic_ton = 0.1 * spring_pressure_kpa + -7.2" in markdown
    assert "BCP_by_controller_kPa = 10.757 * F_by_controller_kN + 21.0" in markdown
    assert "BCP_by_controller_kPa = 10.757 * 9.1 + 21.0" in markdown
    assert "BCP0_EB" in markdown
    assert "25.0" in markdown
    assert "29.56" in markdown
    assert "F_N_PB = parking brake normal force per brake unit (both sides, kN)" in markdown
    assert "F_PB = parking brake braking force per car (kN)" in markdown
    assert "F_PB = brake_geometry_factor * F_N_PB * Np * xi0" in markdown
    assert "brake_geometry_factor = 1 (tread) or 2 * Rf / Dw (caliper)" in markdown
    assert "delta_BCP" not in markdown


def test_cli_writes_markdown_report_when_requested(tmp_path: Path) -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path("src").resolve())
    output_path = tmp_path / "report.md"

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "brake_calc",
            "run",
            "--config",
            "configs/example_input.yaml",
            "--markdown-output",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )

    assert result.returncode == 0
    assert "BCP_calibrated_by_controller" in result.stdout
    assert "# Brake Calculation Report" in output_path.read_text(encoding="utf-8")


def test_dump_report_yaml_uses_spec_aliases() -> None:
    report = Report(
        pressure_standards={"AW0": {"FSB": {"bogie_1": 123.0}}},
        BCP_calibrated_by_controller={"AW0": {"FSB": {"bogie_1": 123.0}}},
        brake_summary={"FSB": {"beta": 1.1}},
        load_summary={"AW0": {"bogie_1": {"mass_dynamic": 10.8, "spring_pressure": 250.0}}},
        controller_pressure_standards={"AW0": {"FSB": {"bogie_1": 123.0}}},
        theoretical_speed_checks={},
        controller_code_params={},
        calibration_summary={},
        parking_brake_check_result={
            "per_car": {},
            "whole_train": {"F_PB": 0.0, "incline_force": 0.0, "safety_margin": 0.0},
            "pass": True,
        },
        delta_BCP={"AW0": {"FSB": {"bogie_1": 0.0}}},
    )

    yaml_output = dump_report_yaml(report)

    assert "pass:" in yaml_output
    assert "pass_:" not in yaml_output
    assert "delta_BCP:" in yaml_output
    assert "delta_bcp:" not in yaml_output
