from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from brake_calc.contracts.report import Report
from brake_calc.io.report import dump_report_markdown


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
    )

    markdown = dump_report_markdown(report)

    assert "# Brake Calculation Report" in markdown
    assert "## Pressure Standards" in markdown
    assert "## Theoretical Speed Checks" in markdown
    assert "beta_used" in markdown
    assert "mass_dynamic_ton = 0.1 * spring_pressure_kpa + -7.2" in markdown


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
