from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest

from brake_calc.contracts.inputs import Inputs


def make_valid_bogie_payload() -> dict[str, object]:
    return {
        "schema_version": 1,
        "v0": 80.0,
        "V_list": [40.0, 80.0],
        "brake_types": [
            {"name": "FSB", "source": "kinematic"},
            {"name": "EB", "source": "kinematic"},
            {"name": "FB", "source": "fast_brake"},
            {"name": "holding", "source": "ratio_of_FSB", "ratio": 0.5},
        ],
        "requirement": {
            "FSB": {"mode": "a_mean", "value": 1.0},
            "EB": {"mode": "distance", "value": 180.0},
        },
        "response_time": {
            "FSB": {"t1": 0.4, "impulse_rate": 1.5},
            "EB": {"t1": 0.3, "t2": 0.6},
            "FB": {"t1": 0.35, "impulse_rate": 1.6},
        },
        "load_groups": ["AW0", "AW2", "AW3"],
        "controller_type": "bogie",
        "n_bogies_by_controller": 1,
        "n_springs_by_controller": 2,
        "n_cylinders_by_controller": 4,
        "allocation_strategy": "equal_wear",
        "vehicle_config": {
            "bogies": [
                {"name": "powered_bogie_1", "bogie_type": "powered_bogie"},
                {"name": "trailer_bogie_1", "bogie_type": "trailer_bogie"},
            ]
        },
        "mass_params": {
            "powered_bogie": {
                "mass_static": {"AW0": 10.0, "AW2": 11.0, "AW3": 12.0},
                "bogie_weight": 2.0,
                "rotational_mass_factor": 0.08,
            },
            "trailer_bogie": {
                "mass_static": {"AW0": 9.0, "AW2": 10.0, "AW3": 11.0},
                "bogie_weight": 1.5,
                "rotational_mass_factor": 0.04,
            },
        },
        "air_spring": {
            "powered_bogie": {
                "mode": "explicit_linear",
                "airspring_k": 20.0,
                "airspring_b": 100.0,
            },
            "trailer_bogie": {
                "mode": "fitted_from_points",
                "points": [
                    {"pressure_kpa": 180.0, "sprung_mass_by_spring_ton": 5.0},
                    {"pressure_kpa": 220.0, "sprung_mass_by_spring_ton": 7.0},
                    {"pressure_kpa": 260.0, "sprung_mass_by_spring_ton": 9.0},
                ],
            },
        },
        "mech_params": {
            "cylinder_type": "tread_cylinder",
            "Sc": 0.0248,
            "xi": 0.29,
            "Li": 3.4,
            "eta_i": 0.95,
            "Lo": 1.0,
            "eta_o": 1.0,
            "Fs1": 1.0,
            "Fs2": 0.25,
        },
        "pressure_calibration": {
            "enabled": True,
            "service_brake": {
                "BCP0": 25.0,
                "point_pair_mode": "aw3_aw0",
                "points": [
                    {"load_group": "AW0", "brake_type": "FB", "k_for_code": 1050.0},
                    {"load_group": "AW3", "brake_type": "FSB", "k_for_code": 1200.0},
                ],
            },
            "emergency_brake": {
                "BCP0": 30.0,
                "point_pair_mode": "aw3_aw0",
                "points": [
                    {"load_group": "AW0", "brake_type": "EB", "k_for_code": 1100.0},
                    {"load_group": "AW3", "brake_type": "EB", "k_for_code": 1250.0},
                ],
            },
        },
        "parking_brake_check": {
            "enabled": True,
            "required_safety_margin": 1.2,
            "static_friction_coefficient": 0.35,
            "n_parking_cylinders_by_car": 1,
            "cylinder": {
                "Fp": 8.75,
                "Fs1": 1.2,
                "Fs2": 0.15,
                "Lpi": 2.04,
                "eta_pi": 1.0,
                "Lo": 1.0,
                "eta_o": 1.0,
            },
            "environment": {
                "wind_speed_max": 34.0,
                "wind_resistance_coefficient": 0.0037,
                "grade_by_load_group": {"AW0": 40.0, "AW3": 40.0},
            },
        },
        "adhesion": {"mu_limit": 0.16},
        "electric_brake": {
            "enabled": False,
            "force_scope": "train_total",
            "characteristic_points": [],
        },
        "EB_limit_min": 100.0,
    }


def make_valid_payload() -> dict[str, object]:
    """兼容历史测试入口，默认返回架控 V1 payload。"""
    return deepcopy(make_valid_bogie_payload())


def make_valid_car_payload() -> dict[str, object]:
    payload = deepcopy(make_valid_bogie_payload())
    payload["controller_type"] = "car"
    payload["n_bogies_by_controller"] = 2
    payload["n_springs_by_controller"] = 4
    payload["n_cylinders_by_controller"] = 8
    payload["vehicle_config"] = {
        "cars": [
            {"name": "powered_car_1", "car_type": "powered_car"},
            {"name": "trailer_car_1", "car_type": "trailer_car"},
        ]
    }
    return payload


def test_inputs_accept_v1_bogie_shape() -> None:
    model = Inputs.model_validate(make_valid_bogie_payload())

    assert model.schema_version == 1
    assert model.brake_types[2].name == "FB"
    assert model.brake_types[2].source == "fast_brake"
    assert model.response_time.FB.impulse_rate == 1.6
    assert model.controller_type == "bogie"
    assert model.n_bogies_by_controller == 1
    assert model.n_springs_by_controller == 2
    assert model.n_cylinders_by_controller == 4
    assert model.mech_params.cylinder_type == "tread_cylinder"
    assert model.pressure_calibration.service_brake.points[0].brake_type == "FB"
    assert model.pressure_calibration.emergency_brake.points[1].load_group == "AW3"
    assert model.parking_brake_check.environment.grade_by_load_group["AW0"] == 40.0
    assert model.adhesion.mu_limit == 0.16
    assert model.electric_brake.force_scope == "train_total"


def test_inputs_accept_car_controller_shape() -> None:
    model = Inputs.model_validate(make_valid_car_payload())

    assert model.schema_version == 1
    assert model.controller_type == "car"
    assert model.n_bogies_by_controller == 2
    assert model.n_springs_by_controller == 4
    assert model.n_cylinders_by_controller == 8
    assert model.vehicle_config.cars[0].car_type == "powered_car"


def test_inputs_accept_instance_display_name_and_mass_static_override() -> None:
    payload = make_valid_bogie_payload()
    payload["vehicle_config"]["bogies"][0]["display_name"] = "1号动架"
    payload["vehicle_config"]["bogies"][0]["mass_static_override"] = {
        "AW0": 10.5,
        "AW2": 11.5,
        "AW3": 12.5,
    }

    model = Inputs.model_validate(payload)

    assert model.vehicle_config.bogies[0].display_name == "1号动架"
    assert model.vehicle_config.bogies[0].mass_static_override.AW0 == 10.5


def test_inputs_accept_car_instance_display_name_and_mass_static_override() -> None:
    payload = make_valid_car_payload()
    payload["vehicle_config"]["cars"][0]["display_name"] = "1号动车"
    payload["vehicle_config"]["cars"][0]["mass_static_override"] = {
        "AW0": 20.5,
        "AW2": 22.5,
        "AW3": 24.5,
    }

    model = Inputs.model_validate(payload)

    assert model.vehicle_config.cars[0].display_name == "1号动车"
    assert model.vehicle_config.cars[0].mass_static_override.AW3 == 24.5


def test_inputs_require_complete_mass_static_override_shape() -> None:
    payload = make_valid_bogie_payload()
    payload["vehicle_config"]["bogies"][0]["mass_static_override"] = {
        "AW0": 10.5,
        "AW3": 12.5,
    }

    with pytest.raises(ValueError, match="AW2"):
        Inputs.model_validate(payload)


def test_inputs_require_positive_mass_static_override_values() -> None:
    payload = make_valid_bogie_payload()
    payload["vehicle_config"]["bogies"][0]["mass_static_override"] = {
        "AW0": 10.5,
        "AW2": 0.0,
        "AW3": 12.5,
    }

    with pytest.raises(ValueError, match="mass_static_override"):
        Inputs.model_validate(payload)


def test_inputs_accept_caliper_cylinder_shape() -> None:
    payload = make_valid_bogie_payload()
    payload["mech_params"]["cylinder_type"] = "caliper_cylinder"
    payload["mech_params"]["Dw"] = 0.72
    payload["mech_params"]["Rf"] = 0.18

    model = Inputs.model_validate(payload)

    assert model.mech_params.cylinder_type == "caliper_cylinder"
    assert model.mech_params.Dw == 0.72
    assert model.mech_params.Rf == 0.18


def test_inputs_default_schema_version_to_one_when_omitted() -> None:
    payload = make_valid_bogie_payload()
    del payload["schema_version"]

    model = Inputs.model_validate(payload)

    assert model.schema_version == 1


def test_inputs_reject_unsupported_schema_version() -> None:
    payload = make_valid_bogie_payload()
    payload["schema_version"] = 2

    with pytest.raises(ValueError, match="schema_version"):
        Inputs.model_validate(payload)


def test_fsb_requirement_only_accepts_a_mean() -> None:
    payload = make_valid_bogie_payload()
    payload["requirement"]["FSB"] = {"mode": "distance", "value": 180.0}

    with pytest.raises(ValueError, match="FSB"):
        Inputs.model_validate(payload)


def test_ratio_of_fsb_does_not_accept_requirement_entry() -> None:
    payload = make_valid_bogie_payload()
    payload["requirement"]["holding"] = {"mode": "a_mean", "value": 0.5}

    with pytest.raises(ValueError, match="ratio_of_FSB"):
        Inputs.model_validate(payload)


def test_inputs_require_response_time_for_fsb_eb_and_fb_when_present() -> None:
    payload = make_valid_bogie_payload()
    del payload["response_time"]["FB"]

    with pytest.raises(ValueError, match="FB"):
        Inputs.model_validate(payload)


def test_inputs_require_fsb_and_eb_brake_types() -> None:
    payload = make_valid_bogie_payload()
    payload["brake_types"] = [{"name": "FSB", "source": "kinematic"}]

    with pytest.raises(ValueError, match="FSB and EB"):
        Inputs.model_validate(payload)


def test_ratio_of_fsb_requires_ratio_value() -> None:
    payload = make_valid_bogie_payload()
    payload["brake_types"] = [
        {"name": "FSB", "source": "kinematic"},
        {"name": "EB", "source": "kinematic"},
        {"name": "holding", "source": "ratio_of_FSB"},
    ]
    del payload["response_time"]["FB"]

    with pytest.raises(ValueError, match="ratio"):
        Inputs.model_validate(payload)


def test_fast_brake_requires_fb_name() -> None:
    payload = make_valid_bogie_payload()
    payload["brake_types"][2] = {"name": "service_fast", "source": "fast_brake"}

    with pytest.raises(ValueError, match="FB"):
        Inputs.model_validate(payload)


def test_fb_rejects_kinematic_source() -> None:
    payload = make_valid_bogie_payload()
    payload["brake_types"][2] = {"name": "FB", "source": "kinematic"}

    with pytest.raises(ValueError, match="fast_brake"):
        Inputs.model_validate(payload)


def test_fb_rejects_ratio_field() -> None:
    payload = make_valid_bogie_payload()
    payload["brake_types"][2]["ratio"] = 0.8

    with pytest.raises(ValueError, match="FB"):
        Inputs.model_validate(payload)


def test_inputs_require_positive_bogie_weight() -> None:
    payload = make_valid_bogie_payload()
    payload["mass_params"]["powered_bogie"]["bogie_weight"] = 0.0

    with pytest.raises(ValueError, match="bogie_weight"):
        Inputs.model_validate(payload)


def test_inputs_require_two_or_more_points_for_air_spring_fit() -> None:
    payload = make_valid_bogie_payload()
    payload["air_spring"]["trailer_bogie"]["points"] = [
        {"pressure_kpa": 180.0, "sprung_mass_by_spring_ton": 5.0}
    ]

    with pytest.raises(ValueError, match="at least two"):
        Inputs.model_validate(payload)


def test_inputs_require_air_spring_fields_for_explicit_linear_mode() -> None:
    payload = make_valid_bogie_payload()
    del payload["air_spring"]["powered_bogie"]["airspring_k"]

    with pytest.raises(ValueError, match="airspring_k"):
        Inputs.model_validate(payload)


def test_inputs_reject_unknown_air_spring_mode() -> None:
    payload = make_valid_bogie_payload()
    payload["air_spring"]["powered_bogie"]["mode"] = "piecewise"

    with pytest.raises(ValueError, match="mode"):
        Inputs.model_validate(payload)


def test_inputs_reject_legacy_sprung_mass_ton_air_spring_point_name() -> None:
    payload = make_valid_bogie_payload()
    payload["air_spring"]["trailer_bogie"]["points"] = [
        {"pressure_kpa": 180.0, "sprung_mass_ton": 5.0},
        {"pressure_kpa": 220.0, "sprung_mass_ton": 7.0},
    ]

    with pytest.raises(ValueError, match="sprung_mass_by_spring_ton"):
        Inputs.model_validate(payload)


def test_bogie_controller_requires_one_two_four_shape() -> None:
    payload = make_valid_bogie_payload()
    payload["n_bogies_by_controller"] = 2

    with pytest.raises(ValueError, match="n_bogies_by_controller"):
        Inputs.model_validate(payload)


def test_car_controller_requires_two_four_eight_shape() -> None:
    payload = make_valid_car_payload()
    payload["n_cylinders_by_controller"] = 4

    with pytest.raises(ValueError, match="n_cylinders_by_controller"):
        Inputs.model_validate(payload)


def test_bogie_controller_rejects_car_vehicle_shape() -> None:
    payload = make_valid_bogie_payload()
    payload["vehicle_config"] = {
        "cars": [{"name": "powered_car_1", "car_type": "powered_car"}]
    }

    with pytest.raises(ValueError, match="bogies"):
        Inputs.model_validate(payload)


def test_car_controller_rejects_bogie_vehicle_shape() -> None:
    payload = make_valid_car_payload()
    payload["vehicle_config"] = {
        "bogies": [{"name": "powered_bogie_1", "bogie_type": "powered_bogie"}]
    }

    with pytest.raises(ValueError, match="cars"):
        Inputs.model_validate(payload)


def test_caliper_cylinder_requires_dw() -> None:
    payload = make_valid_bogie_payload()
    payload["mech_params"]["cylinder_type"] = "caliper_cylinder"
    payload["mech_params"]["Rf"] = 0.18

    with pytest.raises(ValueError, match="Dw"):
        Inputs.model_validate(payload)


def test_caliper_cylinder_requires_rf() -> None:
    payload = make_valid_bogie_payload()
    payload["mech_params"]["cylinder_type"] = "caliper_cylinder"
    payload["mech_params"]["Dw"] = 0.72

    with pytest.raises(ValueError, match="Rf"):
        Inputs.model_validate(payload)


def test_tread_cylinder_rejects_dw_and_rf() -> None:
    payload = make_valid_bogie_payload()
    payload["mech_params"]["Dw"] = 0.72
    payload["mech_params"]["Rf"] = 0.18

    with pytest.raises(ValueError, match="Dw"):
        Inputs.model_validate(payload)


def test_inputs_reject_legacy_pressure_calibration_shape() -> None:
    payload = make_valid_bogie_payload()
    payload["pressure_calibration"] = {
        "enabled": True,
        "calibrated": {},
        "fallback": {"AW2": "AW3"},
    }

    with pytest.raises(ValueError, match="calibrated|fallback"):
        Inputs.model_validate(payload)


def test_inputs_allow_disabled_pressure_calibration_without_detail_blocks() -> None:
    payload = make_valid_bogie_payload()
    payload["pressure_calibration"] = {"enabled": False}

    model = Inputs.model_validate(payload)

    assert model.pressure_calibration.enabled is False
    assert model.pressure_calibration.service_brake is None
    assert model.pressure_calibration.emergency_brake is None


def test_enabled_pressure_calibration_requires_detail_blocks() -> None:
    payload = make_valid_bogie_payload()
    payload["pressure_calibration"] = {"enabled": True}

    with pytest.raises(ValueError, match="service_brake"):
        Inputs.model_validate(payload)


def test_parking_brake_check_requires_cylinder_block() -> None:
    payload = make_valid_bogie_payload()
    del payload["parking_brake_check"]["cylinder"]

    with pytest.raises(ValueError, match="cylinder"):
        Inputs.model_validate(payload)


def test_inputs_allow_disabled_parking_brake_check_without_detail_blocks() -> None:
    payload = make_valid_bogie_payload()
    payload["parking_brake_check"] = {"enabled": False}

    model = Inputs.model_validate(payload)

    assert model.parking_brake_check.enabled is False
    assert model.parking_brake_check.required_safety_margin is None
    assert model.parking_brake_check.static_friction_coefficient is None
    assert model.parking_brake_check.n_parking_cylinders_by_car is None
    assert model.parking_brake_check.cylinder is None
    assert model.parking_brake_check.environment is None


def test_enabled_parking_brake_check_requires_detail_blocks() -> None:
    payload = make_valid_bogie_payload()
    payload["parking_brake_check"] = {"enabled": True}

    with pytest.raises(ValueError, match="required_safety_margin"):
        Inputs.model_validate(payload)


def test_adhesion_requires_positive_mu_limit() -> None:
    payload = make_valid_bogie_payload()
    payload["adhesion"]["mu_limit"] = 0.0

    with pytest.raises(ValueError, match="mu_limit"):
        Inputs.model_validate(payload)


def test_electric_brake_rejects_unknown_force_scope() -> None:
    payload = make_valid_bogie_payload()
    payload["electric_brake"]["force_scope"] = "trainset"

    with pytest.raises(ValueError, match="force_scope"):
        Inputs.model_validate(payload)


def test_inputs_reject_legacy_k_config_name() -> None:
    payload = make_valid_bogie_payload()
    payload["k_config"] = payload.pop("pressure_calibration")

    with pytest.raises(ValueError, match="pressure_calibration"):
        Inputs.model_validate(payload)


def test_inputs_reject_legacy_nbc_mech_param() -> None:
    payload = make_valid_bogie_payload()
    payload["mech_params"] = {"Nbc": 4.0, "eta": 0.95}

    with pytest.raises(ValueError, match="cylinder_type"):
        Inputs.model_validate(payload)


def test_inputs_schema_snapshot_matches_fixture() -> None:
    snapshot_path = Path("tests/fixtures/schemas/inputs.schema.json")
    schema_json = json.dumps(
        Inputs.model_json_schema(),
        indent=2,
        sort_keys=True,
        ensure_ascii=True,
    )

    assert schema_json == snapshot_path.read_text(encoding="utf-8")
