"""本地命令行入口。"""

from __future__ import annotations

import argparse
from pathlib import Path

from brake_calc.io import dump_report_yaml, load_inputs_from_yaml
from brake_calc.workflow.runner import run_workflow


def build_parser() -> argparse.ArgumentParser:
    """构建命令行参数解析器。"""
    parser = argparse.ArgumentParser(prog="brake_calc")
    subparsers = parser.add_subparsers(dest="command")

    run_parser = subparsers.add_parser("run", help="Run the brake calculation workflow.")
    run_parser.add_argument("--config", type=Path, required=True, help="Path to input YAML file.")
    return parser


def main() -> int:
    """执行命令行入口。"""
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "run":
        report = run_workflow(load_inputs_from_yaml(args.config))
        print(dump_report_yaml(report))
    return 0
