"""Workflow runner implementation."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Callable, cast

import yaml

from brake_calc.contracts.context import Context
from brake_calc.contracts.inputs import Inputs
from brake_calc.contracts.report import Report, TraceEntry
from brake_calc.modules import (
    s1_validate_inputs,
    s2_derive_requirement,
    s3_response_compensation,
    s4_calc_dynamic_load_and_mass,
    s5_calc_required_brake_force,
    s6_allocate_brake_force,
    s7_force_to_pressure_base,
    s8_apply_k_calibration,
    s9_summarize_and_checks,
)

ModuleFn = Callable[[Context], Context]

MODULE_REGISTRY: dict[str, ModuleFn] = {
    "validate_inputs": s1_validate_inputs.run,
    "derive_requirement": s2_derive_requirement.run,
    "response_compensation": s3_response_compensation.run,
    "calc_dynamic_load_and_mass": s4_calc_dynamic_load_and_mass.run,
    "calc_required_brake_force": s5_calc_required_brake_force.run,
    "allocate_brake_force": s6_allocate_brake_force.run,
    "force_to_pressure_base": s7_force_to_pressure_base.run,
    "apply_k_calibration": s8_apply_k_calibration.run,
    "summarize_and_checks": s9_summarize_and_checks.run,
}


def _trace_hash(ctx: Context) -> str:
    payload = json.dumps(ctx.model_dump(mode="json"), sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _workflow_definition() -> list[dict[str, object]]:
    workflow_path = Path(__file__).with_name("workflow.yaml")
    content = cast(
        dict[str, list[dict[str, object]]],
        yaml.safe_load(workflow_path.read_text(encoding="utf-8")),
    )
    return content["workflow"]


def run_workflow(inputs: Inputs) -> Report:
    """按 workflow.yaml 顺序执行 brake-calc workflow。"""
    ctx = Context(validated_inputs=inputs)
    for step in _workflow_definition():
        step_id = str(step["id"])
        module_name = str(step["use"])
        start = time.perf_counter()
        before_hash = _trace_hash(ctx)
        ctx = MODULE_REGISTRY[module_name](ctx)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        trace = list(ctx.trace)
        trace.append(
            TraceEntry(
                step_id=step_id,
                module=module_name,
                inputs_hash=before_hash,
                outputs_keys=sorted(ctx.model_dump(exclude_none=True).keys()),
                elapsed_ms=elapsed_ms,
            )
        )
        report = ctx.report
        if report is not None:
            report = report.model_copy(update={"trace": trace})
        ctx = ctx.model_copy(update={"trace": trace, "report": report})
    assert ctx.report is not None
    return ctx.report
