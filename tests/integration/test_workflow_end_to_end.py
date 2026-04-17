from __future__ import annotations

import pytest

from brake_calc.contracts.inputs import Inputs
from brake_calc.workflow.runner import run_workflow
from tests.unit.contracts.test_inputs import make_valid_payload


def test_workflow_end_to_end_matches_reference_shape() -> None:
    report = run_workflow(Inputs.model_validate(make_valid_payload()))

    assert set(report.BCP_calibrated_by_controller) == {"AW0", "AW2", "AW3"}
    assert report.BCP_calibrated_by_controller["AW0"]["FB"]["C1"] == pytest.approx(
        report.BCP_calibrated_by_controller["AW0"]["EB"]["C1"]
    )
    assert len(report.trace) == 9
