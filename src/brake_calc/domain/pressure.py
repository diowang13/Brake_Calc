"""压力换算与限幅纯函数。"""

from __future__ import annotations


def derive_tread_pressure_parameters(
    *,
    n_cylinders: int,
    sc: float,
    xi: float,
    li: float,
    eta_i: float,
    lo: float,
    eta_o: float,
    fs1: float,
    fs2: float,
) -> tuple[float, float]:
    """推导踏面制动缸的 k_initial 与 BCP0_initial。"""
    k_initial = 1.0 / (n_cylinders * lo * eta_o * xi * li * eta_i * sc)
    bcp0_initial = (fs1 / (li * eta_i) + fs2) / sc
    return k_initial, bcp0_initial


def derive_pressure_parameters(
    *,
    n_cylinders: int,
    sc: float,
    xi: float,
    li: float,
    eta_i: float,
    lo: float,
    eta_o: float,
    fs1: float,
    fs2: float,
    lever_ratio: float = 1.0,
) -> tuple[float, float]:
    """按机械倍率推导基础 k_initial 与 BCP0_initial。"""
    # NOTE:
    # `lever_ratio` here refers to the caliper friction geometry factor Dw/(2*Rf),
    # not a mechanical amplification ratio (Li/Lo family).
    if lever_ratio <= 0:
        raise ValueError("lever_ratio must be > 0")
    k_initial = lever_ratio / (n_cylinders * lo * eta_o * xi * li * eta_i * sc)
    bcp0_initial = (fs1 / (li * eta_i) + fs2) / sc
    return k_initial, bcp0_initial


def force_to_pressure_kpa(force_kn: float, k_value: float, bcp0_kpa: float) -> float:
    """按线性力-压力关系换算制动缸压力。"""
    return k_value * force_kn + bcp0_kpa


def clamp_value(value: float, min_value: float, max_value: float) -> tuple[float, bool]:
    """对值执行上下限裁剪。"""
    clamped = min(max(value, min_value), max_value)
    return clamped, clamped != value
