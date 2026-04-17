"""压力换算与限幅纯函数。"""

from __future__ import annotations


def force_to_pressure_kpa(force_kn: float, k_value: float, mechanical_gain: float) -> float:
    """用默认 k 与机械增益换算基础压力。"""
    gain = mechanical_gain if mechanical_gain > 0 else 1.0
    return force_kn * k_value / gain


def clamp_value(value: float, min_value: float, max_value: float) -> tuple[float, bool]:
    """对值执行上下限裁剪。"""
    clamped = min(max(value, min_value), max_value)
    return clamped, clamped != value
