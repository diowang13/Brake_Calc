"""输入数据契约。"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

LoadGroup = Literal["AW0", "AW2", "AW3"]
BrakeTypeSource = Literal["kinematic", "ratio_of_FSB"]
BrakeTypeName = str
RequirementMode = Literal["a_mean", "distance"]
AllocationStrategy = Literal["equal_wear", "equal_adhesion"]
BogieType = Literal["powered_bogie", "trailer_bogie"]
PiecewiseKind = Literal["constant", "linear"]
AirSpringMode = Literal["fitted_from_points", "explicit_linear"]


class BrakeTypeDefinition(BaseModel):
    """制动类型定义。"""

    name: BrakeTypeName = Field(..., description="单位: -")
    source: BrakeTypeSource = Field(..., description="单位: -")
    ratio: float | None = Field(default=None, description="单位: -")

    @model_validator(mode="after")
    def validate_ratio(self) -> "BrakeTypeDefinition":
        """校验比例制动的 ratio。"""
        if self.source == "ratio_of_FSB":
            if self.ratio is None:
                raise ValueError("ratio_of_FSB brake types require ratio")
            if self.ratio <= 0:
                raise ValueError("ratio_of_FSB brake types require ratio > 0")
        return self


class RequirementValue(BaseModel):
    """技术条件输入。"""

    mode: RequirementMode = Field(..., description="单位: -")
    value: float = Field(..., description="单位: m/s^2 or m")

    @model_validator(mode="after")
    def validate_positive_value(self) -> "RequirementValue":
        """校验技术条件值为正。"""
        if self.value <= 0:
            raise ValueError("requirement value must be > 0")
        return self


class FSBResponseTime(BaseModel):
    """FSB 响应参数。"""

    t1: float = Field(..., description="单位: s")
    impulse_rate: float = Field(..., description="单位: m/s^3")

    @model_validator(mode="after")
    def validate_values(self) -> "FSBResponseTime":
        """校验 FSB 响应参数。"""
        if self.t1 < 0:
            raise ValueError("FSB response_time.t1 must be >= 0")
        if self.impulse_rate <= 0:
            raise ValueError("FSB response_time.impulse_rate must be > 0")
        return self


class EBResponseTime(BaseModel):
    """EB 响应参数。"""

    t1: float = Field(..., description="单位: s")
    t2: float = Field(..., description="单位: s")

    @model_validator(mode="after")
    def validate_values(self) -> "EBResponseTime":
        """校验 EB 响应参数。"""
        if self.t1 < 0:
            raise ValueError("EB response_time.t1 must be >= 0")
        if self.t2 <= 0:
            raise ValueError("EB response_time.t2 must be > 0")
        return self


class ResponseTimeConfig(BaseModel):
    """响应时间配置。"""

    model_config = ConfigDict(extra="forbid")

    FSB: FSBResponseTime = Field(..., description="单位: -")
    EB: EBResponseTime = Field(..., description="单位: -")


class BogieConfig(BaseModel):
    """转向架实例配置。"""

    name: str = Field(..., description="单位: -")
    bogie_type: BogieType = Field(..., description="单位: -")


class VehicleConfig(BaseModel):
    """逐转向架实例配置。"""

    bogies: list[BogieConfig] = Field(..., description="单位: -")

    @model_validator(mode="after")
    def validate_unique_names(self) -> "VehicleConfig":
        """校验转向架名称唯一。"""
        names = [bogie.name for bogie in self.bogies]
        if len(names) != len(set(names)):
            raise ValueError("vehicle_config bogie names must be unique")
        return self


class BogieTypeMassParams(BaseModel):
    """转向架类型质量参数。"""

    mass_static: dict[LoadGroup, float] = Field(..., description="输入单位: ton; 内部单位: kg")
    bogie_weight: float = Field(..., description="输入单位: ton; 内部单位: kg")
    rotational_mass_factor: float = Field(..., description="单位: -")

    @model_validator(mode="after")
    def validate_params(self) -> "BogieTypeMassParams":
        """校验类型级质量参数。"""
        if any(value <= 0 for value in self.mass_static.values()):
            raise ValueError("mass_static values must be > 0")
        if self.bogie_weight <= 0:
            raise ValueError("bogie_weight must be > 0")
        if any(value <= self.bogie_weight for value in self.mass_static.values()):
            raise ValueError("mass_static must be > bogie_weight")
        if self.rotational_mass_factor < 0:
            raise ValueError("rotational_mass_factor must be >= 0")
        self.mass_static = {
            load_group: value * 1000.0 for load_group, value in self.mass_static.items()
        }
        self.bogie_weight *= 1000.0
        return self


class MassParams(BaseModel):
    """质量参数集合。"""

    powered_bogie: BogieTypeMassParams = Field(..., description="单位: -")
    trailer_bogie: BogieTypeMassParams = Field(..., description="单位: -")


class AirSpringPoint(BaseModel):
    """空簧特征点。"""

    pressure_kpa: float = Field(..., description="单位: kPa")
    sprung_mass_ton: float = Field(..., description="单位: ton")

    @model_validator(mode="after")
    def validate_point(self) -> "AirSpringPoint":
        """校验空簧特征点。"""
        if self.pressure_kpa <= 0:
            raise ValueError("pressure_kpa must be > 0")
        if self.sprung_mass_ton <= 0:
            raise ValueError("sprung_mass_ton must be > 0")
        return self


class FittedAirSpringConfig(BaseModel):
    """基于特征点拟合的空簧配置。"""

    mode: Literal["fitted_from_points"] = Field(..., description="单位: -")
    points: list[AirSpringPoint] = Field(..., description="单位: -")

    @model_validator(mode="after")
    def validate_points(self) -> "FittedAirSpringConfig":
        """校验拟合特征点数量。"""
        if len(self.points) < 2:
            raise ValueError("fitted_from_points mode requires at least two points")
        return self


class ExplicitLinearAirSpringConfig(BaseModel):
    """显式线性空簧配置。"""

    mode: Literal["explicit_linear"] = Field(..., description="单位: -")
    airspring_k: float = Field(..., description="单位: kPa/ton")
    airspring_b: float = Field(..., description="单位: kPa")


AirSpringConfig = Annotated[
    FittedAirSpringConfig | ExplicitLinearAirSpringConfig,
    Field(discriminator="mode"),
]


class AirSpringParams(BaseModel):
    """空簧配置。"""

    powered_bogie: AirSpringConfig
    trailer_bogie: AirSpringConfig


class MechanicalParams(BaseModel):
    """机械模型参数。"""

    model_config = ConfigDict(extra="allow")


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
    """k 标定配置。"""

    calibrated: dict[LoadGroup, dict[str, KCurve]] = Field(..., description="单位: -")
    fallback: dict[LoadGroup, LoadGroup] = Field(default_factory=dict, description="单位: -")


class Inputs(BaseModel):
    """Workflow 输入根模型。"""

    v0: float = Field(..., description="单位: km/h")
    V_list: list[float] | None = Field(default=None, description="单位: km/h")
    requirement: dict[str, RequirementValue] = Field(..., description="单位: -")
    brake_types: list[BrakeTypeDefinition] = Field(..., description="单位: -")
    response_time: ResponseTimeConfig = Field(..., description="单位: -")
    load_groups: list[LoadGroup] = Field(..., description="单位: -")
    air_spring: AirSpringParams = Field(..., description="单位: -")
    mass_params: MassParams = Field(..., description="单位: -")
    allocation_strategy: AllocationStrategy = Field(..., description="单位: -")
    vehicle_config: VehicleConfig = Field(..., description="单位: -")
    mech_params: MechanicalParams = Field(..., description="单位: -")
    k_config: KConfig = Field(..., description="单位: -")
    EB_limit_min: float = Field(..., description="单位: kPa")

    @model_validator(mode="after")
    def validate_required_shapes(self) -> "Inputs":
        """校验必须的 brake type 与依赖输入。"""
        brake_type_names = [item.name for item in self.brake_types]
        if len(brake_type_names) != len(set(brake_type_names)):
            raise ValueError("brake_types must not contain duplicate names")

        if not {"FSB", "EB"}.issubset(brake_type_names):
            raise ValueError("brake_types must include FSB and EB")

        for brake_type in self.brake_types:
            if brake_type.source == "kinematic" and brake_type.name not in {"FSB", "EB"}:
                raise ValueError("only FSB and EB may use source=kinematic")

        allowed_requirement_names = {"FSB", "EB"}
        extra_requirement_names = set(self.requirement) - allowed_requirement_names
        if extra_requirement_names:
            raise ValueError(
                "ratio_of_FSB brake types must not define requirement: "
                + ", ".join(sorted(extra_requirement_names))
            )

        missing_requirement_names = allowed_requirement_names - set(self.requirement)
        if missing_requirement_names:
            raise ValueError(
                "missing requirement for " + ", ".join(sorted(missing_requirement_names))
            )

        if self.requirement["FSB"].mode != "a_mean":
            raise ValueError("FSB requirement must use mode=a_mean")

        if self.EB_limit_min < 0:
            raise ValueError("EB_limit_min must be >= 0")

        if "AW0" not in self.k_config.calibrated or "AW3" not in self.k_config.calibrated:
            raise ValueError("k_config.calibrated must include AW0 and AW3")

        return self
