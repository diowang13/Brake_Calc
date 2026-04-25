"""停放制动力校核纯函数。"""

from __future__ import annotations

from brake_calc.contracts.inputs import LoadGroup, MechanicalParams, ParkingBrakeCheckConfig
from brake_calc.contracts.report import (
    ParkingBrakeCheckResult,
    ParkingBrakePerCarResult,
    ParkingBrakeWholeTrainResult,
)

GRAVITY_MPS2 = 9.81


def _aggregate_controller_masses_to_cars(
    *,
    controller_type: str,
    controller_masses: dict[str, dict[str, float]],
) -> dict[str, dict[str, float]]:
    """将控制器粒度质量整理为停放校核所需的每车粒度。"""
    if controller_type == "car":
        return controller_masses

    aggregated: dict[str, dict[str, float]] = {}
    items = list(controller_masses.items())
    for index in range(0, len(items), 2):
        car_name = f"car_{(index // 2) + 1}"
        pair = items[index : index + 2]
        aggregated[car_name] = {
            "mass_dynamic": round(sum(values["mass_dynamic"] for _, values in pair), 12),
        }
    return aggregated


def evaluate_parking_brake_check(
    *,
    controller_type: str,
    load_group: LoadGroup,
    controller_masses: dict[str, dict[str, float]],
    parking_config: ParkingBrakeCheckConfig,
    mech_params: MechanicalParams,
) -> ParkingBrakeCheckResult:
    """按车辆粒度计算停放制动力校核结果。"""
    cylinder = parking_config.cylinder
    environment = parking_config.environment
    n_parking_cylinders = parking_config.n_parking_cylinders_by_car
    xi0 = parking_config.static_friction_coefficient
    required_safety_margin = parking_config.required_safety_margin
    grade = environment.grade_by_load_group[load_group] / 1000.0
    per_car_masses = _aggregate_controller_masses_to_cars(
        controller_type=controller_type,
        controller_masses=controller_masses,
    )
    vehicle_count = max(len(per_car_masses), 1)
    wind_force_per_car = (
        environment.wind_resistance_coefficient * (environment.wind_speed_max**2) / vehicle_count
    )
    brake_geometry_factor = 1.0
    if mech_params.cylinder_type == "caliper_cylinder":
        assert mech_params.Dw is not None
        assert mech_params.Rf is not None
        brake_geometry_factor = 2.0 * mech_params.Rf / mech_params.Dw

    force_normal_per_unit = (
        (cylinder.Fp - cylinder.Fs2)
        * cylinder.Lpi
        * cylinder.eta_pi
    )
    force_normal_per_unit = (force_normal_per_unit - cylinder.Fs1) * cylinder.Lo * cylinder.eta_o
    parking_force_per_car = (
        force_normal_per_unit * brake_geometry_factor * n_parking_cylinders * xi0
    )

    per_car: dict[str, ParkingBrakePerCarResult] = {}
    whole_train_parking_force = 0.0
    whole_train_incline_force = 0.0

    for car_name, mass_values in per_car_masses.items():
        incline_force = mass_values["mass_dynamic"] * GRAVITY_MPS2 * grade + wind_force_per_car
        safety_margin = (
            parking_force_per_car / incline_force if incline_force > 0 else float("inf")
        )
        per_car[car_name] = ParkingBrakePerCarResult(
            F_N_PB=round(force_normal_per_unit, 3),
            F_PB=round(parking_force_per_car, 3),
            incline_force=round(incline_force, 3),
            safety_margin=round(safety_margin, 3),
        )
        whole_train_parking_force += parking_force_per_car
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
