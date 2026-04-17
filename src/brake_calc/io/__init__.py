"""I/O helpers for brake-calc."""

from brake_calc.io.config import load_inputs_from_yaml
from brake_calc.io.report import dump_report_yaml

__all__ = ["dump_report_yaml", "load_inputs_from_yaml"]
