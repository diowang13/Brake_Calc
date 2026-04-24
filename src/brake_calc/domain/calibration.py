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


def _resolve_aw0_reference_force(
    case: PressureCalibrationCase,
    force_tensor: dict[str, dict[str, dict[str, float]]],
) -> float:
    """为 aw3_aw2 模式解析 AW0 参考力坐标。"""
    if all(point.brake_type == "EB" for point in case.points):
        aw0_brake_type = "EB"
    else:
        aw0_brake_type = "FB" if "FB" in force_tensor else "FSB"
    return max(force_tensor[aw0_brake_type]["AW0"].values())


def build_point_pair_curve(
    case: PressureCalibrationCase,
    force_tensor: dict[str, dict[str, dict[str, float]]],
) -> tuple[tuple[float, float], tuple[float, float]]:
    """根据试验点构造带常数边界的线性 k(f) 曲线。"""
    if len(case.points) != 2:
        raise ValueError("pressure_calibration case must contain exactly two points in V1")

    points_by_load_group = {point.load_group: point for point in case.points}

    aw3_point = points_by_load_group["AW3"]
    aw3_force = select_reference_force(force_tensor[aw3_point.brake_type]["AW3"], aw3_point)
    aw3_k = k_for_code_to_k_value(aw3_point.k_for_code)

    if case.point_pair_mode == "aw3_aw0":
        aw0_point = points_by_load_group["AW0"]
        aw0_force = select_reference_force(force_tensor[aw0_point.brake_type]["AW0"], aw0_point)
        aw0_k = k_for_code_to_k_value(aw0_point.k_for_code)
        return (aw0_force, aw0_k), (aw3_force, aw3_k)

    aw2_point = points_by_load_group["AW2"]
    aw2_force = select_reference_force(force_tensor[aw2_point.brake_type]["AW2"], aw2_point)
    aw2_k = k_for_code_to_k_value(aw2_point.k_for_code)
    aw0_reference_force = _resolve_aw0_reference_force(case, force_tensor)
    if aw3_force == aw2_force:
        aw0_reference_k = aw2_k
    else:
        aw0_reference_k = aw2_k + (aw3_k - aw2_k) * (
            (aw0_reference_force - aw2_force) / (aw3_force - aw2_force)
        )
    return (aw0_reference_force, aw0_reference_k), (aw3_force, aw3_k)


def evaluate_point_pair_curve(
    force_kn: float,
    point_a: tuple[float, float],
    point_b: tuple[float, float],
) -> float:
    """按两点常数封顶/封底后评估 k(f)。"""
    force_a, k_a = point_a
    force_b, k_b = point_b
    if force_b == force_a:
        return k_b
    if force_kn <= force_a:
        return k_a
    if force_kn >= force_b:
        return k_b
    return k_a + (k_b - k_a) * ((force_kn - force_a) / (force_b - force_a))
