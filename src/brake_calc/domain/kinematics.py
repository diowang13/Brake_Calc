"""运动学相关纯函数。"""

from __future__ import annotations


def kmh_to_mps(speed_kmh: float) -> float:
    """将 km/h 转为 m/s。"""
    return speed_kmh / 3.6


def derive_mean_deceleration(v0_kmh: float, mode: str, value: float) -> float:
    """将输入 requirement 统一换算为平均减速度。"""
    if mode == "a_mean":
        return value
    v0_mps = kmh_to_mps(v0_kmh)
    return (v0_mps**2) / (2.0 * value)


def compensate_target_deceleration(v0_kmh: float, a_mean_req: float, t1: float, t2: float) -> float:
    """根据响应时间补偿控制用目标减速度。"""
    v0_mps = kmh_to_mps(v0_kmh)
    stop_time = max(v0_mps / max(a_mean_req, 1e-6), 1e-6)
    lost_time_ratio = min((t1 + 0.5 * t2) / stop_time, 0.95)
    return a_mean_req / max(1.0 - lost_time_ratio, 0.05)
