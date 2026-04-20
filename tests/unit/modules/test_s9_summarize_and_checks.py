from __future__ import annotations

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.modules.s2_derive_requirement import run as run_s2
from brake_calc.modules.s3_response_compensation import run as run_s3
from brake_calc.modules.s4_calc_dynamic_load_and_mass import run as run_s4
from brake_calc.modules.s5_calc_required_brake_force import run as run_s5
from brake_calc.modules.s6_allocate_brake_force import run as run_s6
from brake_calc.modules.s7_force_to_pressure_base import run as run_s7
from brake_calc.modules.s8_apply_k_calibration import run as run_s8
from brake_calc.modules.s9_summarize_and_checks import run
from tests.unit.contracts.test_inputs import make_valid_payload


def test_s9_builds_report_with_pressure_matrix_and_delta() -> None:
    ctx = Context(validated_inputs=Inputs.model_validate(make_valid_payload()))
    ctx = run_s8(run_s7(run_s6(run_s5(run_s4(run_s3(run_s2(ctx)))))))

    out = run(ctx)

    assert out.report is not None
    assert out.report.BCP_calibrated_by_controller["AW0"]["FSB"]["powered_bogie_1"] > 0.0
    assert "AW0" in out.report.delta_BCP
