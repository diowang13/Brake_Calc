from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import yaml


def test_package_imports() -> None:
    import brake_calc

    assert brake_calc.__version__ == "0.1.0"


def test_cli_help_exits_successfully() -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path("src").resolve())
    result = subprocess.run(
        [sys.executable, "-m", "brake_calc", "--help"],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )

    assert result.returncode == 0
    assert "run" in result.stdout


def test_cli_run_with_example_config_outputs_pressure_matrix() -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path("src").resolve())
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "brake_calc",
            "run",
            "--config",
            "configs/example_input.yaml",
        ],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )

    assert result.returncode == 0
    assert "BCP_calibrated_by_controller" in result.stdout


def test_workflow_yaml_matches_spec_sequence() -> None:
    workflow_path = Path("src/brake_calc/workflow/workflow.yaml")
    workflow = yaml.safe_load(workflow_path.read_text(encoding="utf-8"))

    assert [step["id"] for step in workflow["workflow"]] == [
        "s1",
        "s2",
        "s3",
        "s4",
        "s5",
        "s6",
        "s7",
        "s8",
        "s9",
    ]
