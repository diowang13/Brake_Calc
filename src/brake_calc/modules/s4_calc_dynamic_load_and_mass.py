"""动态载荷与质量模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import (
    ExplicitLinearAirSpringConfig,
    FittedAirSpringConfig,
    Inputs,
)
from brake_calc.domain.mass import (
    calc_air_spring_pressure,
    calc_dynamic_mass,
    fit_air_spring_linear_formula,
)
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def _iter_controllers(inputs: Inputs) -> list[tuple[str, str]]:
    """返回控制器名称和对应的转向架类型。"""
    if inputs.controller_type == "bogie":
        assert inputs.vehicle_config.bogies is not None
        return [(bogie.name, bogie.bogie_type) for bogie in inputs.vehicle_config.bogies]
    assert inputs.vehicle_config.cars is not None
    return [
        (
            car.name,
            "powered_bogie" if car.car_type == "powered_car" else "trailer_bogie",
        )
        for car in inputs.vehicle_config.cars
    ]


def _resolve_air_spring_fit(inputs: Inputs) -> dict[str, dict[str, float | str]]:
    """解析每类转向架的空簧线性公式。"""
    air_spring_fit_by_bogie_type: dict[str, dict[str, float | str]] = {}
    for bogie_type in ("powered_bogie", "trailer_bogie"):
        config = getattr(inputs.air_spring, bogie_type)
        if isinstance(config, FittedAirSpringConfig):
            k, b = fit_air_spring_linear_formula(
                [(point.sprung_mass_by_spring_ton, point.pressure_kpa) for point in config.points]
            )
            source_mode = "fitted_from_points"
        elif isinstance(config, ExplicitLinearAirSpringConfig):
            k = config.airspring_k
            b = config.airspring_b
            source_mode = "explicit_linear"
        else:
            raise InputValidationError(f"unsupported air_spring config for {bogie_type}")
        air_spring_fit_by_bogie_type[bogie_type] = {"k": k, "b": b, "source_mode": source_mode}
    return air_spring_fit_by_bogie_type


def run(ctx: Context) -> Context:
    """按载荷组和控制器计算静态与动态质量。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s4")

    air_spring_fit_by_bogie_type = _resolve_air_spring_fit(inputs)
    mass_by_controller: dict[str, dict[str, dict[str, float]]] = {}
    air_spring_pressure_by_controller: dict[str, dict[str, float]] = {}
    for load_group in inputs.load_groups:
        per_controller: dict[str, dict[str, float]] = {}
        pressure_per_controller: dict[str, float] = {}
        for controller_name, bogie_type in _iter_controllers(inputs):
            params = getattr(inputs.mass_params, bogie_type)
            static_mass = params.mass_static[load_group] * inputs.n_bogies_by_controller
            sprung_mass_ton = static_mass - (params.bogie_weight * inputs.n_bogies_by_controller)
            fit = air_spring_fit_by_bogie_type[bogie_type]
            pressure_per_controller[controller_name] = calc_air_spring_pressure(
                sprung_mass_ton=sprung_mass_ton,
                n_springs_by_controller=inputs.n_springs_by_controller,
                k=float(fit["k"]),
                b=float(fit["b"]),
            )
            per_controller[controller_name] = {
                "mass_static": static_mass,
                "mass_dynamic": calc_dynamic_mass(
                    static_mass=static_mass,
                    aw0_static_mass=params.mass_static["AW0"] * inputs.n_bogies_by_controller,
                    rotational_mass_factor=params.rotational_mass_factor,
                ),
            }
        mass_by_controller[load_group] = per_controller
        air_spring_pressure_by_controller[load_group] = pressure_per_controller
    return ctx.model_copy(
        update={
            "Mass_by_controller": mass_by_controller,
            "AirSpringPressure_by_controller": air_spring_pressure_by_controller,
            "AirSpringFit_by_bogie_type": air_spring_fit_by_bogie_type,
        }
    )
