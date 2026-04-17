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
            {"name": "FB", "source": "copy_of_EB"},
            {"name": "holding", "source": "ratio_of_FSB", "ratio": 0.5},
        ],
        "requirement": {
            "FSB": {"mode": "a_mean", "value": 1.0},
            "EB": {"mode": "a_mean", "value": 1.2},
        },
        "response_time": {
            "FSB": {"t1": 0.4, "t2": 0.8},
            "EB": {"t1": 0.3, "t2": 0.6},
            "FB": {"t1": 0.3, "t2": 0.6},
        },
        "load_groups": ["AW0", "AW2", "AW3"],
        "allocation_strategy": "equal_wear",
        "vehicle_config": {
            "controllers": [
                {
                    "name": "C1",
                    "car_type": "powered",
                    "load_group_shares": {"AW0": 0.5, "AW2": 0.5, "AW3": 0.5},
                },
                {
                    "name": "C2",
                    "car_type": "trailer",
                    "load_group_shares": {"AW0": 0.5, "AW2": 0.5, "AW3": 0.5},
                },
            ]
        },
        "mass_params": {
            "controllers": {
                "C1": {
                    "mass_static_kg": {"AW0": 10000.0, "AW2": 11000.0, "AW3": 12000.0},
                    "rotational_mass_factor": 0.08,
                },
                "C2": {
                    "mass_static_kg": {"AW0": 9000.0, "AW2": 10000.0, "AW3": 11000.0},
                    "rotational_mass_factor": 0.04,
                },
            }
        },
        "air_spring": {"load_group_pressure_kpa": {"AW0": 0.0, "AW2": 100.0, "AW3": 200.0}},
        "mech_params": {"mechanical_gain_by_controller": {"C1": 1.0, "C2": 1.0}},
        "k_config": {
            "default": {"FSB": {"k_const": 1.0}, "EB": {"k_const": 1.1}},
            "calibrated": {
                "AW0": {
                    "FSB": {
                        "segments": [
                            {"min_f": 0.0, "max_f": 9999.0, "kind": "constant", "value": 1.0}
                        ]
                    },
                    "EB": {
                        "segments": [
                            {"min_f": 0.0, "max_f": 9999.0, "kind": "constant", "value": 1.1}
                        ]
                    },
                },
                "AW3": {
                    "FSB": {
                        "segments": [
                            {"min_f": 0.0, "max_f": 9999.0, "kind": "constant", "value": 1.0}
                        ]
                    },
                    "EB": {
                        "segments": [
                            {"min_f": 0.0, "max_f": 9999.0, "kind": "constant", "value": 1.1}
                        ]
                    },
                },
            },
            "fallback": {"AW2": "AW3"},
        },
        "clamp_config": {
            "min_kpa_by_brake_type": {"FSB": 0.0, "EB": 0.0, "FB": 0.0, "holding": 0.0},
            "max_kpa_by_brake_type": {"FSB": 800.0, "EB": 1200.0, "FB": 1200.0, "holding": 600.0},
        },
    }


def test_inputs_accepts_minimal_supported_shape() -> None:
    payload = make_valid_payload()

    model = Inputs.model_validate(payload)

    assert model.brake_types[2].name == "FB"
    assert model.k_config.fallback["AW2"] == "AW3"


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


def test_inputs_schema_snapshot_matches_fixture() -> None:
    snapshot_path = Path("tests/fixtures/schemas/inputs.schema.json")
    schema_json = json.dumps(
        Inputs.model_json_schema(),
        indent=2,
        sort_keys=True,
        ensure_ascii=True,
    )

    assert schema_json == snapshot_path.read_text(encoding="utf-8")
