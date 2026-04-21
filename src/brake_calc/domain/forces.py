"""制动力分配纯函数。"""

from __future__ import annotations


def total_brake_force_kn(dynamic_masses: dict[str, float], beta: float) -> float:
    """按控制器动态质量汇总整车目标制动力。"""
    total_mass = sum(dynamic_masses.values())
    return total_mass * beta


def equal_wear_distribution(controllers: list[str], total_force: float) -> dict[str, float]:
    """等磨耗平均分配。"""
    each_force = total_force / max(len(controllers), 1)
    return {controller: each_force for controller in controllers}


def equal_adhesion_distribution(
    dynamic_masses: dict[str, float],
    total_force: float,
) -> dict[str, float]:
    """按动态质量比例做等黏着分配。"""
    total_mass = sum(dynamic_masses.values())
    if total_mass <= 0:
        return {controller: 0.0 for controller in dynamic_masses}
    return {
        controller: total_force * (mass / total_mass)
        for controller, mass in dynamic_masses.items()
    }
