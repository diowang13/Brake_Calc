"""输出报告契约。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class WarningEntry(BaseModel):
    """非致命告警。"""

    code: str = Field(..., description="单位: -")
    message: str = Field(..., description="单位: -")
    context: dict[str, str | float | int] = Field(default_factory=dict, description="单位: -")


class ClampEvent(BaseModel):
    """限幅事件。"""

    brake_type: str = Field(..., description="单位: -")
    load_group: str = Field(..., description="单位: -")
    controller: str = Field(..., description="单位: -")
    kind: str = Field(..., description="单位: -")
    value_before: float = Field(..., description="单位: kPa")
    value_after: float = Field(..., description="单位: kPa")


class TraceEntry(BaseModel):
    """工作流追溯记录。"""

    step_id: str = Field(..., description="单位: -")
    module: str = Field(..., description="单位: -")
    inputs_hash: str = Field(..., description="单位: -")
    outputs_keys: list[str] = Field(..., description="单位: -")
    elapsed_ms: float = Field(..., description="单位: ms")


PressureMatrix = dict[str, dict[str, dict[str, float]]]
MetricMatrix = dict[str, dict[str, dict[str, float]]]
BrakeSummary = dict[str, dict[str, float]]
SpeedCheckMatrix = dict[str, dict[str, dict[str, float]]]
ControllerCodeParams = dict[str, object]


class Report(BaseModel):
    """最终输出报告。"""

    model_config = ConfigDict(populate_by_name=True)

    pressure_standards: PressureMatrix = Field(..., description="单位: kPa")
    BCP_calibrated_by_controller: PressureMatrix = Field(..., description="单位: kPa")
    brake_summary: BrakeSummary = Field(default_factory=dict, description="单位: m/s^2")
    load_summary: MetricMatrix = Field(default_factory=dict, description="单位: ton, kPa")
    controller_pressure_standards: PressureMatrix = Field(
        default_factory=dict,
        description="单位: kPa",
    )
    theoretical_speed_checks: SpeedCheckMatrix = Field(
        default_factory=dict,
        description="单位: km/h, m/s^2, m",
    )
    controller_code_params: ControllerCodeParams = Field(
        default_factory=dict,
        description="单位: -",
    )
    warnings: list[WarningEntry] = Field(default_factory=list, description="单位: -")
    clamp_events: list[ClampEvent] = Field(default_factory=list, description="单位: -")
    trace: list[TraceEntry] = Field(default_factory=list, description="单位: -")
    delta_bcp: PressureMatrix = Field(
        default_factory=dict,
        description="单位: kPa",
        alias="delta_BCP",
        serialization_alias="delta_BCP",
    )

    @property
    def delta_BCP(self) -> PressureMatrix:  # noqa: N802
        """兼容 spec 命名。"""
        return self.delta_bcp
