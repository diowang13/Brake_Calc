"""配置加载。"""

from __future__ import annotations

from pathlib import Path
from typing import Any, cast

import yaml

from brake_calc.contracts.inputs import Inputs


def load_inputs_from_yaml(path: Path) -> Inputs:
    """从 YAML 文件加载 Inputs。"""
    payload = cast(dict[str, Any], yaml.safe_load(path.read_text(encoding="utf-8")))
    return Inputs.model_validate(payload)
