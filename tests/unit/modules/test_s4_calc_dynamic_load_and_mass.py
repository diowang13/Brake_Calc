from __future__ import annotations

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run as run_s3
from brake_calc.modules.s4_calc_dynamic_load_and_mass import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s4_calculates_static_and_dynamic_mass_by_controller() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s3(run_s2(ctx))

    out = run(ctx)

    assert out.Mass_by_controller["AW0"]["powered_bogie_1"]["mass_static"] == 10000.0
    assert out.Mass_by_controller["AW0"]["powered_bogie_1"]["mass_dynamic"] == 10800.0
    assert out.Mass_by_controller["AW0"]["trailer_bogie_1"]["mass_static"] == 9000.0
    assert out.Mass_by_controller["AW0"]["trailer_bogie_1"]["mass_dynamic"] == 9360.0


def test_s4_outputs_air_spring_pressures_by_controller() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s3(run_s2(ctx))

    out = run(ctx)

    assert out.AirSpringPressure_by_controller["AW0"]["powered_bogie_1"] == 260.0
    assert out.AirSpringPressure_by_controller["AW2"]["powered_bogie_1"] == 280.0
    assert out.AirSpringPressure_by_controller["AW0"]["trailer_bogie_1"] == 230.0
    assert out.AirSpringPressure_by_controller["AW3"]["trailer_bogie_1"] == 270.0


def test_s4_outputs_air_spring_fit_by_bogie_type() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
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
