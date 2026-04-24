"""k(f) 校准纯函数。"""

from __future__ import annotations

from brake_calc.contracts.inputs import PressureCalibrationCase, PressureCalibrationPoint


def resolve_brake_mode(brake_type_name: str, brake_type_source: str) -> str:
    """将制动类型映射到分配逻辑使用的 brake mode。"""
    if brake_type_source == "fast_brake":
        return "FB"
    if brake_type_source == "ratio_of_FSB":
        return "FSB"
    return brake_type_name


def resolve_calibration_case_name(brake_type_name: str, brake_type_source: str) -> str:
    """将制动类型映射到标定组。"""
    if brake_type_name == "EB":
        return "emergency_brake"
    if brake_type_source in {"fast_brake", "ratio_of_FSB"} or brake_type_name == "FSB":
        return "service_brake"
    return "service_brake"


def k_for_code_to_k_value(k_for_code: float) -> float:
    """将控制器整数参数换算为 kPa/kN。"""
    return k_for_code / 100.0


def select_reference_force(
    forces_by_controller: dict[str, float],
    point: PressureCalibrationPoint,
) -> float:
    """按载荷组选择标定点的参考力坐标。"""
    if point.load_group == "AW0":
        return max(forces_by_controller.values())
    if point.load_group == "AW3":
        return min(forces_by_controller.values())
    return sum(forces_by_controller.values()) / len(forces_by_controller)


def build_point_pair_curve(
    case: PressureCalibrationCase,
    force_tensor: dict[str, dict[str, dict[str, float]]],
) -> tuple[tuple[float, float], tuple[float, float]]:
    """根据试验点构造线性 k(f) 曲线。"""
    if len(case.points) != 2:
        raise ValueError("pressure_calibration case must contain exactly two points in V1")

    first_point, second_point = case.points
    first_forces = force_tensor[first_point.brake_type][first_point.load_group]
    second_forces = force_tensor[second_point.brake_type][second_point.load_group]

    first_force = select_reference_force(first_forces, first_point)
    second_force = select_reference_force(second_forces, second_point)
    first_k = k_for_code_to_k_value(first_point.k_for_code)
    second_k = k_for_code_to_k_value(second_point.k_for_code)
    return (first_force, first_k), (second_force, second_k)


def evaluate_point_pair_curve(
    force_kn: float,
    point_a: tuple[float, float],
    point_b: tuple[float, float],
) -> float:
    """按两点线性插值/外推评估 k(f)。"""
    force_a, k_a = point_a
    force_b, k_b = point_b
    if force_b == force_a:
        return k_b
    return k_a + (k_b - k_a) * ((force_kn - force_a) / (force_b - force_a))
