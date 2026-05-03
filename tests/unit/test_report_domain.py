from __future__ import annotations

import pytest

from brake_calc.contracts.inputs import Inputs
from brake_calc.domain.parking_brake import evaluate_parking_brake_check
from brake_calc.domain.reporting import (
    derive_dynamic_mass_formula,
    round_bcp0_for_code,
    round_k_for_code,
    summarize_electric_brake,
    theoretical_speed_check,
)
from tests.unit.contracts.test_inputs import make_valid_car_payload


def test_theoretical_speed_check_uses_existing_fsb_target_beta() -> None:
    check = theoretical_speed_check(
        speed_kmh=20.0,
        beta_target=1.114,
        brake_type="FSB",
        t1=0.4,
        impulse_rate=0.75,
    )

    expected_distance = (20.0 / 3.6) * 0.4 + (20.0 / 3.6) ** 2 / (2.0 * 1.114)
    expected_distance += (20.0 / 3.6) * 1.114 / (2.0 * 0.75)
    assert check["theoretical_distance_m"] == pytest.approx(expected_distance)
    assert check["requirement_a_mean"] == pytest.approx(
        (20.0 / 3.6) ** 2 / (2.0 * expected_distance)
    )
    assert check["beta_used"] == pytest.approx(1.114)


def test_theoretical_speed_check_uses_existing_eb_target_beta() -> None:
    check = theoretical_speed_check(
        speed_kmh=40.0,
        beta_target=1.334,
        brake_type="EB",
        t1=0.3,
        t2=1.2,
    )

    expected_distance = (40.0 / 3.6) * (0.3 + 0.5 * 1.2)
    expected_distance += (40.0 / 3.6) ** 2 / (2.0 * 1.334)
    assert check["theoretical_distance_m"] == pytest.approx(expected_distance)
    assert check["requirement_a_mean"] == pytest.approx(
        (40.0 / 3.6) ** 2 / (2.0 * expected_distance)
    )
    assert check["beta_used"] == pytest.approx(1.334)


def test_round_report_values_applies_business_precision() -> None:
    from brake_calc.domain.reporting import round_report_values

    rounded = round_report_values(
        {
            "pressure": 123.51,
            "mass_dynamic": 10.876,
            "spring_pressure": 249.5,
            "theoretical_distance_m": 61.72,
            "requirement_a_mean": 1.23456,
            "beta_used": 1.33351,
        }
    )

    assert rounded == {
        "pressure": 124.0,
        "mass_dynamic": 10.88,
        "spring_pressure": 250.0,
        "theoretical_distance_m": 62.0,
        "requirement_a_mean": 1.235,
        "beta_used": 1.334,
    }


def test_dynamic_mass_formula_inverts_air_spring_pressure_to_controller_mass() -> None:
    formula = derive_dynamic_mass_formula(
        airspring_k=20.0,
        airspring_b=100.0,
        n_springs_by_controller=2,
        bogie_weight=2.0,
        aw0_static_mass=10.0,
        rotational_mass_factor=0.08,
    )

    assert formula["a_ton_per_kpa"] == pytest.approx(0.1)
    assert formula["b_ton"] == pytest.approx(-7.2)
    assert formula["expression"] == "mass_dynamic_ton = 0.1 * spring_pressure_kpa + -7.2"


def test_pressure_code_rounding_uses_controller_units() -> None:
    assert round_k_for_code(10.757) == 1076
    assert round_bcp0_for_code(21.0) == 25


def test_evaluate_parking_brake_check_returns_per_car_and_whole_train_summary() -> None:
    result = evaluate_parking_brake_check(
        controller_type="car",
        load_group="AW0",
        controller_masses={
            "powered_car_1": {"mass_static": 22.0},
            "trailer_car_1": {"mass_static": 20.0},
        },
        parking_config=Inputs.model_validate(make_valid_car_payload()).parking_brake_check,
        mech_params=Inputs.model_validate(make_valid_car_payload()).mech_params,
    )

    assert sorted(result.per_car) == ["powered_car_1", "trailer_car_1"]
    assert result.per_car["powered_car_1"].F_N_PB == pytest.approx(16.344)
    assert result.per_car["powered_car_1"].F_PB == pytest.approx(5.72, abs=1e-3)
    assert result.per_car["powered_car_1"].incline_force == pytest.approx(10.772, abs=1e-3)
    assert result.whole_train.F_PB == pytest.approx(11.441, abs=1e-3)
    assert result.whole_train.incline_force == pytest.approx(20.758, abs=1e-3)
    assert result.pass_ is False


def test_evaluate_parking_brake_check_uses_caliper_geometry_factor_for_force() -> None:
    payload = make_valid_car_payload()
    payload["mech_params"]["cylinder_type"] = "caliper_cylinder"
    payload["mech_params"]["Dw"] = 0.72
    payload["mech_params"]["Rf"] = 0.18
    inputs = Inputs.model_validate(payload)

    result = evaluate_parking_brake_check(
        controller_type="car",
        load_group="AW0",
        controller_masses={"powered_car_1": {"mass_static": 22.0}},
        parking_config=inputs.parking_brake_check,
        mech_params=inputs.mech_params,
    )

    assert result.per_car["powered_car_1"].F_N_PB == pytest.approx(16.344)
    assert result.per_car["powered_car_1"].F_PB == pytest.approx(2.86, abs=1e-3)


def test_evaluate_parking_brake_check_distributes_wind_term_by_vehicle_count() -> None:
    inputs = Inputs.model_validate(make_valid_car_payload())

    result = evaluate_parking_brake_check(
        controller_type="car",
        load_group="AW0",
        controller_masses={
            "powered_car_1": {"mass_static": 22.0},
            "trailer_car_1": {"mass_static": 20.0},
            "powered_car_2": {"mass_static": 22.0},
        },
        parking_config=inputs.parking_brake_check,
        mech_params=inputs.mech_params,
    )

    assert result.per_car["powered_car_1"].incline_force == pytest.approx(10.058, abs=1e-3)
    assert result.whole_train.incline_force == pytest.approx(29.391, abs=1e-3)


def test_summarize_electric_brake_keeps_head_and_tail_preview() -> None:
    summary = summarize_electric_brake(
        enabled=True,
        force_scope="train_total",
        characteristic_points=[
            {"speed_kmh": 0.0, "force_kN": 0.0},
            {"speed_kmh": 10.0, "force_kN": 20.0},
            {"speed_kmh": 20.0, "force_kN": 40.0},
            {"speed_kmh": 30.0, "force_kN": 55.0},
            {"speed_kmh": 40.0, "force_kN": 70.0},
            {"speed_kmh": 50.0, "force_kN": 80.0},
            {"speed_kmh": 60.0, "force_kN": 90.0},
        ],
    )

    assert summary.enabled is True
    assert summary.force_scope == "train_total"
    assert summary.preview_head == [
        {"speed_kmh": 0.0, "force_kN": 0.0},
        {"speed_kmh": 10.0, "force_kN": 20.0},
        {"speed_kmh": 20.0, "force_kN": 40.0},
    ]
    assert summary.preview_tail == [
        {"speed_kmh": 40.0, "force_kN": 70.0},
        {"speed_kmh": 50.0, "force_kN": 80.0},
        {"speed_kmh": 60.0, "force_kN": 90.0},
    ]
