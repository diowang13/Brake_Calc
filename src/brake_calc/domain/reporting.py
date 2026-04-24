"""报告汇总用纯函数。"""

from __future__ import annotations

import math
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Literal

from brake_calc.contracts.report import ElectricBrakeSummary
from brake_calc.domain.kinematics import kmh_to_mps


def _round_half_up(value: float, digits: int) -> float:
    quantizer = Decimal("1") if digits == 0 else Decimal(f"1e-{digits}")
    return float(Decimal(str(value)).quantize(quantizer, rounding=ROUND_HALF_UP))


def round_kpa(value: float) -> float:
    """将 kPa 报告值四舍五入到整数。"""
    return _round_half_up(value, 0)


def round_distance_m(value: float) -> float:
    """将距离报告值四舍五入到整数。"""
    return _round_half_up(value, 0)


def round_mass_ton(value: float) -> float:
    """将载重报告值四舍五入到小数点后 2 位。"""
    return _round_half_up(value, 2)


def round_deceleration(value: float) -> float:
    """将减速度报告值四舍五入到小数点后 3 位。"""
    return _round_half_up(value, 3)


def round_report_values(values: dict[str, float]) -> dict[str, float]:
    """按报告字段语义应用业务精度。"""
    rounded = dict(values)
    for key, value in values.items():
        if key in {"pressure", "spring_pressure", "BCP0_used", "theoretical_distance_m"}:
            rounded[key] = (
                round_distance_m(value) if key == "theoretical_distance_m" else round_kpa(value)
            )
        elif key == "mass_dynamic":
            rounded[key] = round_mass_ton(value)
        elif key in {"requirement_a_mean", "beta", "beta_target", "beta_used"}:
            rounded[key] = round_deceleration(value)
    return rounded


def theoretical_speed_check(
    *,
    speed_kmh: float,
    beta_target: float,
    brake_type: Literal["FSB", "EB", "FB"],
    t1: float,
    impulse_rate: float | None = None,
    t2: float | None = None,
) -> dict[str, float]:
    """使用既定目标减速度，前向计算指定初速度的理论检查量。"""
    if speed_kmh <= 0:
        raise ValueError("speed_kmh must be > 0")
    if beta_target <= 0:
        raise ValueError("beta_target must be > 0")
    if t1 < 0:
        raise ValueError("t1 must be >= 0")

    speed_mps = kmh_to_mps(speed_kmh)
    if brake_type in {"FSB", "FB"}:
        if impulse_rate is None:
            raise ValueError(f"{brake_type} speed check requires impulse_rate")
        if impulse_rate <= 0:
            raise ValueError("impulse_rate must be > 0")
        theoretical_distance_m = (
            speed_mps * t1
            + speed_mps**2 / (2.0 * beta_target)
            + speed_mps * beta_target / (2.0 * impulse_rate)
        )
    else:
        if t2 is None:
            raise ValueError("EB speed check requires t2")
        if t2 < 0:
            raise ValueError("t2 must be >= 0")
        theoretical_distance_m = speed_mps * (t1 + 0.5 * t2) + speed_mps**2 / (
            2.0 * beta_target
        )

    requirement_a_mean = speed_mps**2 / (2.0 * theoretical_distance_m)
    return {
        "requirement_a_mean": requirement_a_mean,
        "theoretical_distance_m": theoretical_distance_m,
        "beta_used": beta_target,
    }


def derive_dynamic_mass_formula(
    *,
    airspring_k: float,
    airspring_b: float,
    n_springs_by_controller: int,
    bogie_weight: float,
    aw0_static_mass: float,
    rotational_mass_factor: float,
) -> dict[str, float | str]:
    """推导控制器使用的空簧压力到动态质量公式。"""
    if airspring_k <= 0:
        raise ValueError("airspring_k must be > 0")
    a_ton_per_kpa = n_springs_by_controller / airspring_k
    b_ton = (
        bogie_weight
        + aw0_static_mass * rotational_mass_factor
        - n_springs_by_controller * airspring_b / airspring_k
    )
    return {
        "a_ton_per_kpa": a_ton_per_kpa,
        "b_ton": b_ton,
        "expression": (
            f"mass_dynamic_ton = {a_ton_per_kpa:.12g} * spring_pressure_kpa "
            f"+ {b_ton:.12g}"
        ),
    }


def summarize_electric_brake(
    *,
    enabled: bool,
    force_scope: str,
    characteristic_points: list[dict[str, Any]],
) -> ElectricBrakeSummary:
    """提取电制动特性点摘要。"""
    preview_count = 3
    if len(characteristic_points) <= preview_count:
        preview_head = characteristic_points
        preview_tail = characteristic_points
    else:
        preview_head = characteristic_points[:preview_count]
        preview_tail = characteristic_points[-preview_count:]
    return ElectricBrakeSummary(
        enabled=enabled,
        force_scope=force_scope,
        preview_head=preview_head,
        preview_tail=preview_tail,
    )


def round_k_for_code(k_value: float) -> int:
    """将 kPa/kN 的 k 值转换为控制器整数参数。"""
    return math.ceil(k_value * 100.0)


def round_bcp0_for_code(bcp0_kpa: float) -> int:
    """将 BCP0 按 5 kPa 单位向上圆整。"""
    return math.ceil(bcp0_kpa / 5.0) * 5
