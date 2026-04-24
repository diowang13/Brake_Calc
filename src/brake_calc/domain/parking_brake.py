"""停放制动力校核纯函数。"""

from __future__ import annotations

from brake_calc.contracts.inputs import LoadGroup, ParkingBrakeCheckConfig
from brake_calc.contracts.report import (
    ParkingBrakeCheckResult,
    ParkingBrakePerCarResult,
    ParkingBrakeWholeTrainResult,
)

GRAVITY_MPS2 = 9.81


def evaluate_parking_brake_check(
    *,
    controller_type: str,
    load_group: LoadGroup,
    controller_masses: dict[str, dict[str, float]],
    parking_config: ParkingBrakeCheckConfig,
) -> ParkingBrakeCheckResult:
    """按车辆粒度计算停放制动力校核结果。"""
    _ = controller_type
    cylinder = parking_config.cylinder
    environment = parking_config.environment
    n_parking_cylinders = parking_config.n_parking_cylinders_by_car
    mu = parking_config.static_friction_coefficient
    required_safety_margin = parking_config.required_safety_margin
    grade = environment.grade_by_load_group[load_group] / 1000.0

    force_normal = (
        (cylinder.Fp - cylinder.Fs1 - cylinder.Fs2)
        * cylinder.Lpi
        * cylinder.eta_pi
        * cylinder.Lo
        * cylinder.eta_o
        * n_parking_cylinders
    )
    parking_force = force_normal * mu

    per_car: dict[str, ParkingBrakePerCarResult] = {}
    whole_train_parking_force = 0.0
    whole_train_incline_force = 0.0

    for controller, mass_values in controller_masses.items():
        incline_force = mass_values["mass_dynamic"] * GRAVITY_MPS2 * grade
        safety_margin = parking_force / incline_force if incline_force > 0 else float("inf")
        per_car[controller] = ParkingBrakePerCarResult(
            F_N_PB=round(force_normal, 3),
            F_PB=round(parking_force, 3),
            incline_force=round(incline_force, 3),
            safety_margin=round(safety_margin, 3),
        )
        whole_train_parking_force += parking_force
        whole_train_incline_force += incline_force

    whole_train_safety_margin = (
        whole_train_parking_force / whole_train_incline_force
        if whole_train_incline_force > 0
        else float("inf")
    )
    return ParkingBrakeCheckResult.model_validate(
        {
            "per_car": per_car,
            "whole_train": ParkingBrakeWholeTrainResult(
                F_PB=round(whole_train_parking_force, 3),
                incline_force=round(whole_train_incline_force, 3),
                safety_margin=round(whole_train_safety_margin, 3),
            ),
            "pass": whole_train_safety_margin >= required_safety_margin,
        }
    )
