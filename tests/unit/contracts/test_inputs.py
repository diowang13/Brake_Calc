from __future__ import annotations

import json
from pathlib import Path

import pytest

from brake_calc.contracts.inputs import Inputs


def make_valid_payload() -> dict[str, object]:
    return {
        "v0": 80.0,
        "brake_types": [
            {"name": "FSB", "source": "kinematic"},
            {"name": "EB", "source": "kinematic"},
            {"name": "holding", "source": "ratio_of_FSB", "ratio": 0.5},
        ],
        "requirement": {
            "FSB": {"mode": "a_mean", "value": 1.0},
            "EB": {"mode": "a_mean", "value": 1.2},
        },
        "response_time": {
            "FSB": {"t1": 0.4, "impulse_rate": 1.5},
            "EB": {"t1": 0.3, "t2": 0.6},
        },
        "load_groups": ["AW0", "AW2", "AW3"],
        "controller_type": "bogie",
        "n_bogies_by_controller": 1,
        "n_springs_by_controller": 2,
        "n_cylinders_by_controller": 4,
        "allocation_strategy": "equal_wear",
        "vehicle_config": {
            "bogies": [
                {
                    "name": "powered_bogie_1",
                    "bogie_type": "powered_bogie",
                },
                {
                    "name": "trailer_bogie_1",
                    "bogie_type": "trailer_bogie",
                },
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
            "calibrated": {
                "AW0": {
                    "FSB": {
                        "BCP0": 25.0,
                        "k_segments": [
                            {"min_f": 0.0, "max_f": 9999.0, "kind": "constant", "value": 10.7}
                        ]
                    },
                    "EB": {
                        "BCP0": 25.0,
                        "k_segments": [
                            {"min_f": 0.0, "max_f": 9999.0, "kind": "constant", "value": 11.0}
                        ]
                    },
                },
                "AW3": {
                    "FSB": {
                        "BCP0": 30.0,
                        "k_segments": [
                            {"min_f": 0.0, "max_f": 9999.0, "kind": "constant", "value": 12.0}
                        ]
                    },
                    "EB": {
                        "BCP0": 35.0,
                        "k_segments": [
                            {"min_f": 0.0, "max_f": 9999.0, "kind": "constant", "value": 13.0}
                        ]
                    },
                },
            },
            "fallback": {"AW2": "AW3"},
        },
        "EB_limit_min": 100.0,
    }


def test_inputs_accepts_minimal_supported_shape() -> None:
    payload = make_valid_payload()

    model = Inputs.model_validate(payload)

    assert model.brake_types[2].name == "holding"
    assert model.response_time.FSB.impulse_rate == 1.5
    assert model.mass_params.powered_bogie.mass_static["AW0"] == 10.0
    assert model.mass_params.powered_bogie.bogie_weight == 2.0
    assert model.air_spring.powered_bogie.mode == "explicit_linear"
    assert model.air_spring.trailer_bogie.mode == "fitted_from_points"
    assert model.controller_type == "bogie"
    assert model.n_bogies_by_controller == 1
    assert model.n_springs_by_controller == 2
    assert model.n_cylinders_by_controller == 4
    assert model.mech_params.cylinder_type == "tread_cylinder"
    assert model.pressure_calibration.calibrated["AW0"]["FSB"].BCP0 == 25.0
    assert model.pressure_calibration.fallback["AW2"] == "AW3"


def test_fsb_requirement_only_accepts_a_mean() -> None:
    payload = make_valid_payload()
    payload["requirement"]["FSB"] = {"mode": "distance", "value": 180.0}

    with pytest.raises(ValueError, match="FSB"):
        Inputs.model_validate(payload)


def test_ratio_of_fsb_does_not_accept_requirement_entry() -> None:
    payload = make_valid_payload()
    payload["requirement"]["holding"] = {"mode": "a_mean", "value": 0.5}

    with pytest.raises(ValueError, match="ratio_of_FSB"):
        Inputs.model_validate(payload)


def test_inputs_require_response_time_for_fsb_and_eb_only() -> None:
    payload = make_valid_payload()
    del payload["response_time"]["FSB"]

    with pytest.raises(ValueError, match="response_time"):
        Inputs.model_validate(payload)


def test_inputs_require_fsb_and_eb_brake_types() -> None:
    payload = make_valid_payload()
    payload["brake_types"] = [{"name": "FSB", "source": "kinematic"}]

    with pytest.raises(ValueError, match="FSB and EB"):
        Inputs.model_validate(payload)


def test_ratio_of_fsb_requires_ratio_value() -> None:
    payload = make_valid_payload()
    payload["brake_types"] = [
        {"name": "FSB", "source": "kinematic"},
        {"name": "EB", "source": "kinematic"},
        {"name": "holding", "source": "ratio_of_FSB"},
    ]

    with pytest.raises(ValueError, match="ratio"):
        Inputs.model_validate(payload)


def test_inputs_require_positive_bogie_weight() -> None:
    payload = make_valid_payload()
    payload["mass_params"]["powered_bogie"]["bogie_weight"] = 0.0

    with pytest.raises(ValueError, match="bogie_weight"):
        Inputs.model_validate(payload)


def test_inputs_require_two_or_more_points_for_air_spring_fit() -> None:
    payload = make_valid_payload()
    payload["air_spring"]["trailer_bogie"]["points"] = [
        {"pressure_kpa": 180.0, "sprung_mass_by_spring_ton": 5.0}
    ]

    with pytest.raises(ValueError, match="at least two"):
        Inputs.model_validate(payload)


def test_inputs_require_air_spring_fields_for_explicit_linear_mode() -> None:
    payload = make_valid_payload()
    del payload["air_spring"]["powered_bogie"]["airspring_k"]

    with pytest.raises(ValueError, match="airspring_k"):
        Inputs.model_validate(payload)


def test_inputs_reject_unknown_air_spring_mode() -> None:
    payload = make_valid_payload()
    payload["air_spring"]["powered_bogie"]["mode"] = "piecewise"

    with pytest.raises(ValueError, match="mode"):
        Inputs.model_validate(payload)


def test_inputs_reject_legacy_sprung_mass_ton_air_spring_point_name() -> None:
    payload = make_valid_payload()
    payload["air_spring"]["trailer_bogie"]["points"] = [
        {"pressure_kpa": 180.0, "sprung_mass_ton": 5.0},
        {"pressure_kpa": 220.0, "sprung_mass_ton": 7.0},
    ]

    with pytest.raises(ValueError, match="sprung_mass_by_spring_ton"):
        Inputs.model_validate(payload)


def test_inputs_reject_car_controller_type_during_mvp() -> None:
    payload = make_valid_payload()
    payload["controller_type"] = "car"
    payload["n_bogies_by_controller"] = 2
    payload["n_springs_by_controller"] = 4
    payload["n_cylinders_by_controller"] = 8

    with pytest.raises(ValueError, match="controller_type=bogie"):
        Inputs.model_validate(payload)


def test_inputs_require_one_bogie_for_bogie_controller() -> None:
    payload = make_valid_payload()
    payload["n_bogies_by_controller"] = 2

    with pytest.raises(ValueError, match="n_bogies_by_controller"):
        Inputs.model_validate(payload)


def test_inputs_require_two_springs_for_bogie_controller() -> None:
    payload = make_valid_payload()
    payload["n_springs_by_controller"] = 4

    with pytest.raises(ValueError, match="n_springs_by_controller"):
        Inputs.model_validate(payload)


def test_inputs_require_four_cylinders_for_bogie_controller() -> None:
    payload = make_valid_payload()
    payload["n_cylinders_by_controller"] = 8

    with pytest.raises(ValueError, match="n_cylinders_by_controller"):
        Inputs.model_validate(payload)


def test_inputs_reject_legacy_k_config_name() -> None:
    payload = make_valid_payload()
    payload["k_config"] = payload.pop("pressure_calibration")

    with pytest.raises(ValueError, match="pressure_calibration"):
        Inputs.model_validate(payload)


def test_inputs_reject_legacy_nbc_mech_param() -> None:
    payload = make_valid_payload()
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
