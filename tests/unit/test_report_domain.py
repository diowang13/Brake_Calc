from __future__ import annotations

import pytest

from brake_calc.domain.reporting import (
    derive_dynamic_mass_formula,
    round_bcp0_for_code,
    round_k_for_code,
    theoretical_speed_check,
)


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
