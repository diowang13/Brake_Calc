from __future__ import annotations

from brake_calc.domain.mass import calc_air_spring_pressure, calc_dynamic_mass


def test_calc_dynamic_mass_uses_aw0_static_mass_for_rotational_increment() -> None:
    dynamic_mass = calc_dynamic_mass(
        static_mass=23.32,
        aw0_static_mass=15.82,
        rotational_mass_factor=0.1,
    )

    assert dynamic_mass == 24.902


def test_calc_air_spring_pressure_uses_sprung_mass_per_spring() -> None:
    pressure = calc_air_spring_pressure(
        sprung_mass_ton=8.0,
        n_springs_by_controller=2,
        k=20.0,
        b=100.0,
    )

    assert pressure == 180.0
