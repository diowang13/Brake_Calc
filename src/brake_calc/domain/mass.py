"""质量计算纯函数。"""

from __future__ import annotations


def calc_dynamic_mass(static_mass: float, rotational_mass_factor: float) -> float:
    """计算含旋转质量的动态制动质量。"""
    return static_mass * (1.0 + rotational_mass_factor)


def fit_air_spring_linear_formula(points: list[tuple[float, float]]) -> tuple[float, float]:
    """按最小二乘法拟合空簧线性公式 pressure = k * sprung_mass + b。"""
    if len(points) < 2:
        raise ValueError("at least two points are required to fit air spring formula")

    x_values = [point[0] for point in points]
    y_values = [point[1] for point in points]
    x_mean = sum(x_values) / len(x_values)
    y_mean = sum(y_values) / len(y_values)
    denominator = sum((value - x_mean) ** 2 for value in x_values)
    if denominator <= 0:
        raise ValueError("air spring points must span at least two sprung_mass values")
    numerator = sum((x_value - x_mean) * (y_value - y_mean) for x_value, y_value in points)
    k = numerator / denominator
    b = y_mean - k * x_mean
    return k, b


def calc_air_spring_pressure(sprung_mass_ton: float, k: float, b: float) -> float:
    """按线性公式计算空簧压力。"""
    return k * sprung_mass_ton + b
