"""运动学相关纯函数。"""

from __future__ import annotations


def kmh_to_mps(speed_kmh: float) -> float:
    """将 km/h 转为 m/s。"""
    return speed_kmh / 3.6


def derive_mean_deceleration(v0_kmh: float, mode: str, value: float) -> float:
    """将输入 requirement 统一换算为平均减速度。"""
    if value <= 0:
        raise ValueError("requirement value must be > 0")
    if mode == "a_mean":
        return value
    if mode == "distance":
        v0_mps = kmh_to_mps(v0_kmh)
        return (v0_mps**2) / (2.0 * value)
    raise ValueError(f"unsupported requirement mode: {mode}")


def braking_distance_from_mean_deceleration(v0_kmh: float, a_mean_req: float) -> float:
    """按平均减速度要求反算标准制动距离。"""
    if a_mean_req <= 0:
        raise ValueError("a_mean_req must be > 0")
    v0_mps = kmh_to_mps(v0_kmh)
    return (v0_mps**2) / (2.0 * a_mean_req)


def compensate_target_deceleration(v0_kmh: float, a_mean_req: float, t1: float, t2: float) -> float:
    """按距离扣除模型补偿控制用目标减速度。"""
    v0_mps = kmh_to_mps(v0_kmh)
    braking_distance = braking_distance_from_mean_deceleration(v0_kmh, a_mean_req)
    effective_distance = braking_distance - v0_mps * (t1 + 0.5 * t2)
    if effective_distance <= 0:
        raise ValueError("response distance loss exceeds braking distance")
    return (v0_mps**2) / (2.0 * effective_distance)


def solve_fsb_target_deceleration(
    v0_kmh: float,
    a_mean_req: float,
    t1: float,
    impulse_rate: float,
) -> float:
    """按距离扣除模型和 FSB 冲击率联立求解控制用目标减速度。"""
    if impulse_rate <= 0:
        raise ValueError("impulse_rate must be > 0")

    v0_mps = kmh_to_mps(v0_kmh)
    braking_distance = braking_distance_from_mean_deceleration(v0_kmh, a_mean_req)
    distance_after_dead_time = braking_distance - v0_mps * t1
    if distance_after_dead_time <= 0:
        raise ValueError("FSB dead-time distance loss exceeds braking distance")

    quadratic_term = v0_mps / impulse_rate
    linear_term = 2.0 * distance_after_dead_time
    discriminant = linear_term**2 - (4.0 * quadratic_term * v0_mps**2)
    if discriminant < 0:
        raise ValueError("FSB response parameters do not yield a real control deceleration")

    return (linear_term - discriminant**0.5) / (2.0 * quadratic_term)
