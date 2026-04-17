"""模块间上下文契约。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from brake_calc.contracts.inputs import Inputs
from brake_calc.contracts.report import ClampEvent, Report, TraceEntry, WarningEntry

MassVector = dict[str, dict[str, dict[str, float]]]
ForceTensor = dict[str, dict[str, dict[str, float]]]
PressureTensor = dict[str, dict[str, dict[str, float]]]
KTensor = dict[str, dict[str, dict[str, float]]]


class Context(BaseModel):
    """Workflow 追加式上下文。"""

    validated_inputs: Inputs | None = Field(default=None, description="单位: -")
    a_mean_req: dict[str, float] = Field(default_factory=dict, description="单位: m/s^2")
    Beta_list: dict[str, float] = Field(default_factory=dict, description="单位: m/s^2")
    Mass_by_controller: MassVector = Field(default_factory=dict, description="单位: kg")
    F_by_controller: ForceTensor = Field(default_factory=dict, description="单位: kN")
    BCP_base_by_controller: PressureTensor = Field(default_factory=dict, description="单位: kPa")
    k_used_by_controller: KTensor = Field(default_factory=dict, description="单位: -")
    BCP_calibrated_by_controller: PressureTensor = Field(
        default_factory=dict,
        description="单位: kPa",
    )
    clamp_events: list[ClampEvent] = Field(default_factory=list, description="单位: -")
    warnings: list[WarningEntry] = Field(default_factory=list, description="单位: -")
    trace: list[TraceEntry] = Field(default_factory=list, description="单位: -")
    report: Report | None = Field(default=None, description="单位: -")
