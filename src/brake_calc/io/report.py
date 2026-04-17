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
