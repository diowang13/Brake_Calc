"""质量计算纯函数。"""

from __future__ import annotations


def calc_dynamic_mass(static_mass: float, rotational_mass_factor: float) -> float:
    """计算含旋转质量的动态制动质量。"""
    return static_mass * (1.0 + rotational_mass_factor)
