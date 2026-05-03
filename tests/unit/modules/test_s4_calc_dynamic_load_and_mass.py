from __future__ import annotations

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run as run_s3
from brake_calc.modules.s4_calc_dynamic_load_and_mass import run
from tests.unit.contracts.test_inputs import make_valid_bogie_payload, make_valid_car_payload


def test_s4_calculates_static_and_dynamic_mass_by_bogie_controller() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_bogie_payload()))
    ctx = run_s3(run_s2(ctx))

    out = run(ctx)

    assert out.Mass_by_controller["AW0"]["powered_bogie_1"]["mass_static"] == 10.0
    assert out.Mass_by_controller["AW0"]["powered_bogie_1"]["mass_dynamic"] == 11.0
    assert out.Mass_by_controller["AW0"]["trailer_bogie_1"]["mass_static"] == 9.0
    assert out.Mass_by_controller["AW0"]["trailer_bogie_1"]["mass_dynamic"] == 9.45


def test_s4_aggregates_mass_by_car_controller() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_car_payload()))
    ctx = run_s3(run_s2(ctx))

    out = run(ctx)

    assert out.Mass_by_controller["AW0"]["powered_car_1"]["mass_static"] == 20.0
    assert out.Mass_by_controller["AW0"]["powered_car_1"]["mass_dynamic"] == 22.0
    assert out.Mass_by_controller["AW0"]["trailer_car_1"]["mass_static"] == 18.0
    assert out.Mass_by_controller["AW0"]["trailer_car_1"]["mass_dynamic"] == 18.9


def test_s4_outputs_air_spring_pressures_by_controller() -> None:
    bogie_ctx = Context(validated_inputs=Inputs.model_validate(make_valid_bogie_payload()))
    bogie_ctx = run_s3(run_s2(bogie_ctx))

    bogie_out = run(bogie_ctx)

    assert bogie_out.AirSpringPressure_by_controller["AW0"]["powered_bogie_1"] == 180.0
    assert bogie_out.AirSpringPressure_by_controller["AW0"]["trailer_bogie_1"] == 155.0

    car_ctx = Context(validated_inputs=Inputs.model_validate(make_valid_car_payload()))
    car_ctx = run_s3(run_s2(car_ctx))

    car_out = run(car_ctx)

    assert car_out.AirSpringPressure_by_controller["AW0"]["powered_car_1"] == 180.0
    assert car_out.AirSpringPressure_by_controller["AW0"]["trailer_car_1"] == 155.0


def test_s4_outputs_air_spring_fit_by_bogie_type() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_bogie_payload()))
    ctx = run_s3(run_s2(ctx))

    out = run(ctx)

    assert out.AirSpringFit_by_bogie_type["powered_bogie"] == {
        "k": 20.0,
        "b": 100.0,
        "source_mode": "explicit_linear",
    }
    assert out.AirSpringFit_by_bogie_type["trailer_bogie"]["k"] == 20.0
    assert out.AirSpringFit_by_bogie_type["trailer_bogie"]["b"] == 80.0
    assert out.AirSpringFit_by_bogie_type["trailer_bogie"]["source_mode"] == "fitted_from_points"


def test_s4_uses_fixed_rotational_mass_factor_by_bogie_type() -> None:
    payload = make_valid_bogie_payload()
    payload["mass_params"]["powered_bogie"]["rotational_mass_factor"] = 0.0
    payload["mass_params"]["trailer_bogie"]["rotational_mass_factor"] = 0.0
    ctx = Context(validated_inputs=Inputs.model_validate(payload))
    ctx = run_s3(run_s2(ctx))

    out = run(ctx)

    assert out.Mass_by_controller["AW0"]["powered_bogie_1"]["mass_dynamic"] == 11.0
    assert out.Mass_by_controller["AW0"]["trailer_bogie_1"]["mass_dynamic"] == 9.45
