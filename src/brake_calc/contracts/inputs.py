"""输入数据契约。"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

LoadGroup = Literal["AW0", "AW2", "AW3"]
BrakeTypeSource = Literal["kinematic", "fast_brake", "ratio_of_FSB"]
BrakeTypeName = str
RequirementMode = Literal["a_mean", "distance"]
AllocationStrategy = Literal["equal_wear", "equal_adhesion"]
BogieType = Literal["powered_bogie", "trailer_bogie"]
CarType = Literal["powered_car", "trailer_car"]
ControllerType = Literal["bogie", "car"]
AirSpringMode = Literal["fitted_from_points", "explicit_linear"]
CylinderType = Literal["tread_cylinder", "caliper_cylinder"]
PointPairMode = Literal["aw3_aw0", "aw3_aw2"]
ElectricBrakeForceScope = Literal["train_total", "per_car", "per_bogie", "per_axle"]


class BrakeTypeDefinition(BaseModel):
    """制动类型定义。"""

    model_config = ConfigDict(extra="forbid")

    name: BrakeTypeName = Field(..., description="单位: -")
    source: BrakeTypeSource = Field(..., description="单位: -")
    ratio: float | None = Field(default=None, description="单位: -")

    @model_validator(mode="after")
    def validate_ratio(self) -> "BrakeTypeDefinition":
        """校验制动类型附加字段。"""
        if self.source == "ratio_of_FSB":
            if self.ratio is None:
                raise ValueError("ratio_of_FSB brake types require ratio")
            if self.ratio <= 0:
                raise ValueError("ratio_of_FSB brake types require ratio > 0")
        elif self.ratio is not None:
            raise ValueError(f"{self.name} brake type must not define ratio")
        return self


class RequirementValue(BaseModel):
    """技术条件输入。"""

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

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


class FBResponseTime(BaseModel):
    """FB 响应参数。"""

    model_config = ConfigDict(extra="forbid")

    t1: float = Field(..., description="单位: s")
    impulse_rate: float = Field(..., description="单位: m/s^3")

    @model_validator(mode="after")
    def validate_values(self) -> "FBResponseTime":
        """校验 FB 响应参数。"""
        if self.t1 < 0:
            raise ValueError("FB response_time.t1 must be >= 0")
        if self.impulse_rate <= 0:
            raise ValueError("FB response_time.impulse_rate must be > 0")
        return self


class ResponseTimeConfig(BaseModel):
    """响应时间配置。"""

    model_config = ConfigDict(extra="forbid")

    FSB: FSBResponseTime = Field(..., description="单位: -")
    EB: EBResponseTime = Field(..., description="单位: -")
    FB: FBResponseTime | None = Field(default=None, description="单位: -")


class BogieConfig(BaseModel):
    """转向架实例配置。"""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="单位: -")
    bogie_type: BogieType = Field(..., description="单位: -")


class CarConfig(BaseModel):
    """车辆实例配置。"""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="单位: -")
    car_type: CarType = Field(..., description="单位: -")


class VehicleConfig(BaseModel):
    """控制器实例配置。"""

    model_config = ConfigDict(extra="forbid")

    bogies: list[BogieConfig] | None = Field(default=None, description="单位: -")
    cars: list[CarConfig] | None = Field(default=None, description="单位: -")

    @model_validator(mode="after")
    def validate_unique_names(self) -> "VehicleConfig":
        """校验实例名称唯一。"""
        names: list[str] = []
        if self.bogies is not None:
            names.extend(item.name for item in self.bogies)
        if self.cars is not None:
            names.extend(item.name for item in self.cars)
        if len(names) != len(set(names)):
            raise ValueError("vehicle_config names must be unique")
        return self


class BogieTypeMassParams(BaseModel):
    """转向架类型质量参数。"""

    model_config = ConfigDict(extra="forbid")

    mass_static: dict[LoadGroup, float] = Field(..., description="单位: ton")
    bogie_weight: float = Field(..., description="单位: ton")
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
        return self


class MassParams(BaseModel):
    """质量参数集合。"""

    model_config = ConfigDict(extra="forbid")

    powered_bogie: BogieTypeMassParams = Field(..., description="单位: -")
    trailer_bogie: BogieTypeMassParams = Field(..., description="单位: -")


class AirSpringPoint(BaseModel):
    """空簧特征点。"""

    model_config = ConfigDict(extra="forbid")

    pressure_kpa: float = Field(..., description="单位: kPa")
    sprung_mass_by_spring_ton: float = Field(..., description="单位: ton")

    @model_validator(mode="after")
    def validate_point(self) -> "AirSpringPoint":
        """校验空簧特征点。"""
        if self.pressure_kpa <= 0:
            raise ValueError("pressure_kpa must be > 0")
        if self.sprung_mass_by_spring_ton <= 0:
            raise ValueError("sprung_mass_by_spring_ton must be > 0")
        return self


class FittedAirSpringConfig(BaseModel):
    """基于特征点拟合的空簧配置。"""

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

    mode: Literal["explicit_linear"] = Field(..., description="单位: -")
    airspring_k: float = Field(..., description="单位: kPa/ton")
    airspring_b: float = Field(..., description="单位: kPa")


AirSpringConfig = Annotated[
    FittedAirSpringConfig | ExplicitLinearAirSpringConfig,
    Field(discriminator="mode"),
]


class AirSpringParams(BaseModel):
    """空簧配置。"""

    model_config = ConfigDict(extra="forbid")

    powered_bogie: AirSpringConfig
    trailer_bogie: AirSpringConfig


class MechanicalParams(BaseModel):
    """机械模型参数。"""

    model_config = ConfigDict(extra="forbid")

    cylinder_type: CylinderType = Field(..., description="单位: -")
    Sc: float = Field(..., description="单位: m^2")
    xi: float = Field(..., description="单位: -")
    Li: float = Field(..., description="单位: -")
    eta_i: float = Field(..., description="单位: -")
    Lo: float = Field(..., description="单位: -")
    eta_o: float = Field(..., description="单位: -")
    Fs1: float = Field(..., description="单位: kN")
    Fs2: float = Field(..., description="单位: kN")
    Dw: float | None = Field(default=None, description="单位: m")
    Rf: float | None = Field(default=None, description="单位: m")

    @model_validator(mode="after")
    def validate_values(self) -> "MechanicalParams":
        """校验机械模型参数。"""
        if self.Sc <= 0:
            raise ValueError("Sc must be > 0")
        if self.xi <= 0:
            raise ValueError("xi must be > 0")
        if self.Li <= 0:
            raise ValueError("Li must be > 0")
        if self.eta_i <= 0:
            raise ValueError("eta_i must be > 0")
        if self.Lo <= 0:
            raise ValueError("Lo must be > 0")
        if self.eta_o <= 0:
            raise ValueError("eta_o must be > 0")
        if self.Fs1 < 0:
            raise ValueError("Fs1 must be >= 0")
        if self.Fs2 < 0:
            raise ValueError("Fs2 must be >= 0")

        if self.cylinder_type == "caliper_cylinder":
            if self.Dw is None:
                raise ValueError("caliper_cylinder requires Dw")
            if self.Rf is None:
                raise ValueError("caliper_cylinder requires Rf")
            if self.Dw <= 0:
                raise ValueError("Dw must be > 0")
            if self.Rf <= 0:
                raise ValueError("Rf must be > 0")
        if self.cylinder_type == "tread_cylinder" and (
            self.Dw is not None or self.Rf is not None
        ):
            raise ValueError("tread_cylinder must not define Dw or Rf")
        return self


class PressureCalibrationPoint(BaseModel):
    """单个标定试验点。"""

    model_config = ConfigDict(extra="forbid")

    load_group: LoadGroup = Field(..., description="单位: -")
    brake_type: str = Field(..., description="单位: -")
    k_for_code: float = Field(..., description="单位: kPa/kN")

    @model_validator(mode="after")
    def validate_value(self) -> "PressureCalibrationPoint":
        """校验试验点数值。"""
        if self.k_for_code <= 0:
            raise ValueError("k_for_code must be > 0")
        return self


class PressureCalibrationCase(BaseModel):
    """一组制动模式标定配置。"""

    model_config = ConfigDict(extra="forbid")

    BCP0: float = Field(..., description="单位: kPa")
    point_pair_mode: PointPairMode = Field(..., description="单位: -")
    points: list[PressureCalibrationPoint] = Field(..., description="单位: -")

    @model_validator(mode="after")
    def validate_values(self) -> "PressureCalibrationCase":
        """校验标定组结构。"""
        if self.BCP0 < 0:
            raise ValueError("BCP0 must be >= 0")
        if not self.points:
            raise ValueError("pressure_calibration points must not be empty")
        return self


class PressureCalibrationConfig(BaseModel):
    """压力标定配置。"""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = Field(default=True, description="单位: -")
    service_brake: PressureCalibrationCase | None = Field(default=None, description="单位: -")
    emergency_brake: PressureCalibrationCase | None = Field(default=None, description="单位: -")

    @model_validator(mode="after")
    def validate_enabled_shape(self) -> "PressureCalibrationConfig":
        """仅在启用标定时要求完整结构。"""
        if not self.enabled:
            return self
        if self.service_brake is None:
            raise ValueError("service_brake is required when pressure_calibration.enabled = true")
        if self.emergency_brake is None:
            raise ValueError("emergency_brake is required when pressure_calibration.enabled = true")
        return self


class ParkingBrakeCylinderConfig(BaseModel):
    """停放制动缸参数。"""

    model_config = ConfigDict(extra="forbid")

    Fp: float = Field(..., description="单位: kN")
    Fs1: float = Field(..., description="单位: kN")
    Fs2: float = Field(..., description="单位: kN")
    Lpi: float = Field(..., description="单位: -")
    eta_pi: float = Field(..., description="单位: -")
    Lo: float = Field(..., description="单位: -")
    eta_o: float = Field(..., description="单位: -")

    @model_validator(mode="after")
    def validate_values(self) -> "ParkingBrakeCylinderConfig":
        """校验停放制动缸参数。"""
        if self.Fp <= 0:
            raise ValueError("Fp must be > 0")
        if self.Fs1 < 0:
            raise ValueError("Fs1 must be >= 0")
        if self.Fs2 < 0:
            raise ValueError("Fs2 must be >= 0")
        if self.Lpi <= 0:
            raise ValueError("Lpi must be > 0")
        if self.eta_pi <= 0:
            raise ValueError("eta_pi must be > 0")
        if self.Lo <= 0:
            raise ValueError("Lo must be > 0")
        if self.eta_o <= 0:
            raise ValueError("eta_o must be > 0")
        return self


class ParkingBrakeEnvironmentConfig(BaseModel):
    """停放制动环境参数。"""

    model_config = ConfigDict(extra="forbid")

    wind_speed_max: float = Field(..., description="单位: m/s")
    wind_resistance_coefficient: float = Field(..., description="单位: -")
    grade_by_load_group: dict[LoadGroup, float] = Field(..., description="单位: ‰")

    @model_validator(mode="after")
    def validate_values(self) -> "ParkingBrakeEnvironmentConfig":
        """校验环境参数。"""
        if self.wind_speed_max < 0:
            raise ValueError("wind_speed_max must be >= 0")
        if self.wind_resistance_coefficient < 0:
            raise ValueError("wind_resistance_coefficient must be >= 0")
        return self


class ParkingBrakeCheckConfig(BaseModel):
    """停放制动力校核配置。"""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = Field(..., description="单位: -")
    required_safety_margin: float | None = Field(default=None, description="单位: -")
    static_friction_coefficient: float | None = Field(default=None, description="单位: -")
    n_parking_cylinders_by_car: int | None = Field(default=None, description="单位: -")
    cylinder: ParkingBrakeCylinderConfig | None = Field(default=None, description="单位: -")
    environment: ParkingBrakeEnvironmentConfig | None = Field(default=None, description="单位: -")

    @model_validator(mode="after")
    def validate_values(self) -> "ParkingBrakeCheckConfig":
        """校验停放制动力校核配置。"""
        if not self.enabled:
            return self
        if self.required_safety_margin is None:
            raise ValueError(
                "required_safety_margin is required when parking_brake_check.enabled = true"
            )
        if self.static_friction_coefficient is None:
            raise ValueError(
                "static_friction_coefficient is required when parking_brake_check.enabled = true"
            )
        if self.n_parking_cylinders_by_car is None:
            raise ValueError(
                "n_parking_cylinders_by_car is required when parking_brake_check.enabled = true"
            )
        if self.cylinder is None:
            raise ValueError("cylinder is required when parking_brake_check.enabled = true")
        if self.environment is None:
            raise ValueError("environment is required when parking_brake_check.enabled = true")
        if self.required_safety_margin <= 0:
            raise ValueError("required_safety_margin must be > 0")
        if self.static_friction_coefficient <= 0:
            raise ValueError("static_friction_coefficient must be > 0")
        if self.n_parking_cylinders_by_car <= 0:
            raise ValueError("n_parking_cylinders_by_car must be > 0")
        return self


class AdhesionConfig(BaseModel):
    """黏着限制配置。"""

    model_config = ConfigDict(extra="forbid")

    mu_limit: float = Field(..., description="单位: -")

    @model_validator(mode="after")
    def validate_value(self) -> "AdhesionConfig":
        """校验黏着限制。"""
        if self.mu_limit <= 0:
            raise ValueError("mu_limit must be > 0")
        return self


class ElectricBrakeConfig(BaseModel):
    """电制动输入预留。"""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = Field(..., description="单位: -")
    force_scope: ElectricBrakeForceScope = Field(..., description="单位: -")
    characteristic_points: list[dict[str, Any]] = Field(..., description="单位: -")


class Inputs(BaseModel):
    """Workflow 输入根模型。"""

    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(default=1, description="单位: -")
    v0: float = Field(..., description="单位: km/h")
    V_list: list[float] | None = Field(default=None, description="单位: km/h")
    requirement: dict[str, RequirementValue] = Field(..., description="单位: -")
    brake_types: list[BrakeTypeDefinition] = Field(..., description="单位: -")
    response_time: ResponseTimeConfig = Field(..., description="单位: -")
    load_groups: list[LoadGroup] = Field(..., description="单位: -")
    controller_type: ControllerType = Field(..., description="单位: -")
    n_bogies_by_controller: int = Field(..., description="单位: -")
    n_springs_by_controller: int = Field(..., description="单位: -")
    n_cylinders_by_controller: int = Field(..., description="单位: -")
    air_spring: AirSpringParams = Field(..., description="单位: -")
    mass_params: MassParams = Field(..., description="单位: -")
    allocation_strategy: AllocationStrategy = Field(..., description="单位: -")
    vehicle_config: VehicleConfig = Field(..., description="单位: -")
    mech_params: MechanicalParams = Field(..., description="单位: -")
    pressure_calibration: PressureCalibrationConfig = Field(..., description="单位: -")
    parking_brake_check: ParkingBrakeCheckConfig = Field(..., description="单位: -")
    adhesion: AdhesionConfig = Field(..., description="单位: -")
    electric_brake: ElectricBrakeConfig = Field(..., description="单位: -")
    EB_limit_min: float = Field(..., description="单位: kPa")

    @model_validator(mode="after")
    def validate_required_shapes(self) -> "Inputs":
        """校验 V1 输入契约形状。"""
        if self.schema_version != 1:
            raise ValueError("schema_version must be 1 for V1")

        brake_type_names = [item.name for item in self.brake_types]
        if len(brake_type_names) != len(set(brake_type_names)):
            raise ValueError("brake_types must not contain duplicate names")

        if not {"FSB", "EB"}.issubset(brake_type_names):
            raise ValueError("brake_types must include FSB and EB")

        for brake_type in self.brake_types:
            if brake_type.name == "FB" and brake_type.source != "fast_brake":
                raise ValueError("FB must use source=fast_brake")
            if brake_type.source == "kinematic" and brake_type.name not in {"FSB", "EB"}:
                raise ValueError("only FSB and EB may use source=kinematic")
            if brake_type.source == "fast_brake" and brake_type.name != "FB":
                raise ValueError("source=fast_brake requires brake type name FB")

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

        if "FB" in brake_type_names and self.response_time.FB is None:
            raise ValueError("FB brake type requires response_time.FB")

        if self.controller_type == "bogie":
            if self.n_bogies_by_controller != 1:
                raise ValueError("controller_type=bogie requires n_bogies_by_controller=1")
            if self.n_springs_by_controller != 2:
                raise ValueError("controller_type=bogie requires n_springs_by_controller=2")
            if self.n_cylinders_by_controller != 4:
                raise ValueError("controller_type=bogie requires n_cylinders_by_controller=4")
            if self.vehicle_config.bogies is None:
                raise ValueError("controller_type=bogie requires vehicle_config.bogies")
            if self.vehicle_config.cars is not None:
                raise ValueError("controller_type=bogie must not define vehicle_config.cars")

        if self.controller_type == "car":
            if self.n_bogies_by_controller != 2:
                raise ValueError("controller_type=car requires n_bogies_by_controller=2")
            if self.n_springs_by_controller != 4:
                raise ValueError("controller_type=car requires n_springs_by_controller=4")
            if self.n_cylinders_by_controller != 8:
                raise ValueError("controller_type=car requires n_cylinders_by_controller=8")
            if self.vehicle_config.cars is None:
                raise ValueError("controller_type=car requires vehicle_config.cars")
            if self.vehicle_config.bogies is not None:
                raise ValueError("controller_type=car must not define vehicle_config.bogies")

        if self.EB_limit_min < 0:
            raise ValueError("EB_limit_min must be >= 0")

        return self
