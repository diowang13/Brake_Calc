"""输入数据契约。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

LoadGroup = Literal["AW0", "AW2", "AW3"]
BrakeTypeSource = Literal["kinematic", "copy_of_EB", "ratio_of_FSB"]
BrakeTypeName = str
RequirementMode = Literal["a_mean", "distance"]
AllocationStrategy = Literal["equal_wear", "equal_adhesion"]
CarType = Literal["powered", "trailer"]
PiecewiseKind = Literal["constant", "linear"]


class BrakeTypeDefinition(BaseModel):
    """制动类型定义。"""

    name: BrakeTypeName = Field(..., description="单位: -")
    source: BrakeTypeSource = Field(..., description="单位: -")
    ratio: float | None = Field(default=None, description="单位: -")

    @model_validator(mode="after")
    def validate_ratio(self) -> "BrakeTypeDefinition":
        """校验比例制动的 ratio。"""
        if self.source == "ratio_of_FSB" and self.ratio is None:
            raise ValueError("ratio_of_FSB brake types require ratio")
        return self


class RequirementValue(BaseModel):
    """技术条件输入。"""

    mode: RequirementMode = Field(..., description="单位: -")
    value: float = Field(..., description="单位: m/s^2 or m")


class ResponseTimeEntry(BaseModel):
    """响应时间参数。"""

    t1: float = Field(..., description="单位: s")
    t2: float = Field(..., description="单位: s")


class ControllerConfig(BaseModel):
    """控制器配置。"""

    name: str = Field(..., description="单位: -")
    car_type: CarType = Field(..., description="单位: -")
    load_group_shares: dict[LoadGroup, float] = Field(..., description="单位: -")


class VehicleConfig(BaseModel):
    """控制器所在车辆配置。"""

    controllers: list[ControllerConfig] = Field(..., description="单位: -")


class ControllerMassParams(BaseModel):
    """控制器质量参数。"""

    mass_static_kg: dict[LoadGroup, float] = Field(..., description="单位: kg")
    rotational_mass_factor: float = Field(..., description="单位: -")


class MassParams(BaseModel):
    """质量参数集合。"""

    controllers: dict[str, ControllerMassParams] = Field(..., description="单位: -")


class AirSpringParams(BaseModel):
    """空簧配置。"""

    load_group_pressure_kpa: dict[LoadGroup, float] = Field(..., description="单位: kPa")


class MechanicalParams(BaseModel):
    """机械模型参数。"""

    mechanical_gain_by_controller: dict[str, float] = Field(..., description="单位: kPa/kN")


class KDefaultEntry(BaseModel):
    """默认 k 参数。"""

    k_const: float = Field(..., description="单位: -")


class KSegment(BaseModel):
    """k(f) 分段定义。"""

    min_f: float = Field(..., description="单位: kN")
    max_f: float = Field(..., description="单位: kN")
    kind: PiecewiseKind = Field(..., description="单位: -")
    value: float | None = Field(default=None, description="单位: -")
    start_value: float | None = Field(default=None, description="单位: -")
    end_value: float | None = Field(default=None, description="单位: -")

    @model_validator(mode="after")
    def validate_segment_shape(self) -> "KSegment":
        """校验分段配置。"""
        if self.kind == "constant" and self.value is None:
            raise ValueError("constant segment requires value")
        if self.kind == "linear" and (self.start_value is None or self.end_value is None):
            raise ValueError("linear segment requires start_value and end_value")
        return self


class KCurve(BaseModel):
    """k(f) 曲线。"""

    segments: list[KSegment] = Field(..., description="单位: -")


class KConfig(BaseModel):
    """k 默认值与标定配置。"""

    default: dict[str, KDefaultEntry] = Field(..., description="单位: -")
    calibrated: dict[LoadGroup, dict[str, KCurve]] = Field(..., description="单位: -")
    fallback: dict[LoadGroup, LoadGroup] = Field(default_factory=dict, description="单位: -")


class ClampConfig(BaseModel):
    """阀件限幅配置。"""

    min_kpa_by_brake_type: dict[str, float] = Field(..., description="单位: kPa")
    max_kpa_by_brake_type: dict[str, float] = Field(..., description="单位: kPa")


class Inputs(BaseModel):
    """Workflow 输入根模型。"""

    v0: float = Field(..., description="单位: km/h")
    V_list: list[float] | None = Field(default=None, description="单位: km/h")
    requirement: dict[str, RequirementValue] = Field(..., description="单位: -")
    brake_types: list[BrakeTypeDefinition] = Field(..., description="单位: -")
    response_time: dict[str, ResponseTimeEntry] = Field(..., description="单位: s")
    load_groups: list[LoadGroup] = Field(..., description="单位: -")
    air_spring: AirSpringParams = Field(..., description="单位: -")
    mass_params: MassParams = Field(..., description="单位: -")
    allocation_strategy: AllocationStrategy = Field(..., description="单位: -")
    vehicle_config: VehicleConfig = Field(..., description="单位: -")
    mech_params: MechanicalParams = Field(..., description="单位: -")
    k_config: KConfig = Field(..., description="单位: -")
    clamp_config: ClampConfig = Field(..., description="单位: -")

    @model_validator(mode="after")
    def validate_required_shapes(self) -> "Inputs":
        """校验必须的 brake type 与依赖输入。"""
        brake_type_names = {item.name for item in self.brake_types}
        if not {"FSB", "EB"}.issubset(brake_type_names):
            raise ValueError("brake_types must include FSB and EB")

        for brake_type in self.brake_types:
            if brake_type.source == "kinematic" and brake_type.name not in self.requirement:
                raise ValueError(f"missing requirement for {brake_type.name}")
            if brake_type.source == "kinematic" and brake_type.name not in self.response_time:
                raise ValueError(f"missing response_time for {brake_type.name}")
            if brake_type.source == "copy_of_EB" and "EB" not in self.response_time:
                raise ValueError("copy_of_EB requires EB response_time")

        controller_names = {controller.name for controller in self.vehicle_config.controllers}
        if controller_names != set(self.mass_params.controllers):
            raise ValueError("vehicle_config controllers must match mass_params controllers")
        if controller_names != set(self.mech_params.mechanical_gain_by_controller):
            raise ValueError("vehicle_config controllers must match mech_params controllers")

        if "FSB" not in self.k_config.default or "EB" not in self.k_config.default:
            raise ValueError("k_config.default must include FSB and EB")
        if "AW0" not in self.k_config.calibrated or "AW3" not in self.k_config.calibrated:
            raise ValueError("k_config.calibrated must include AW0 and AW3")

        return self
