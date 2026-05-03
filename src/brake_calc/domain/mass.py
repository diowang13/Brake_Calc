"""质量计算纯函数。"""

from __future__ import annotations


def rotational_mass_factor_for_bogie_type(bogie_type: str) -> float:
    """返回固定旋转质量系数。"""
    if bogie_type == "powered_bogie":
        return 0.1
    if bogie_type == "trailer_bogie":
        return 0.05
    raise ValueError(f"unsupported bogie_type: {bogie_type}")


def calc_dynamic_mass(
    static_mass: float,
    aw0_static_mass: float,
    rotational_mass_factor: float,
) -> float:
    """计算含旋转质量的动态制动质量。"""
    return static_mass + aw0_static_mass * rotational_mass_factor


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


def calc_air_spring_pressure(
    sprung_mass_ton: float,
    n_springs_by_controller: int,
    k: float,
    b: float,
) -> float:
    """按单个空簧承担的簧上质量计算空簧压力。"""
    if n_springs_by_controller <= 0:
        raise ValueError("n_springs_by_controller must be > 0")
    sprung_mass_per_spring = sprung_mass_ton / n_springs_by_controller
    return k * sprung_mass_per_spring + b
