import { useEffect, useMemo, useState, type ReactElement } from "react";

import {
  ghostActionStyle,
  panelStyle,
  primaryActionStyle,
  secondaryActionStyle
} from "../app/styles";
import {
  ActiveInfoTabs,
  CalibrationConfigCard,
  FieldBlock,
  InfoCard,
  NavSection,
  PointRow,
  TogglePill
} from "../components/ui";

export type CarControllerRow = {
  name: string;
  type: "powered_car" | "trailer_car";
};

export type BogieControllerRow = {
  name: string;
  type: "powered_bogie" | "trailer_bogie";
};

function CountCard({
  title,
  poweredLabel,
  poweredCount,
  trailerLabel,
  trailerCount,
  tone = "neutral",
  emphasizeCounts = false
}: {
  title: string;
  poweredLabel: string;
  poweredCount: number;
  trailerLabel: string;
  trailerCount: number;
  tone?: "neutral" | "danger";
  emphasizeCounts?: boolean;
}): ReactElement {
  const isDanger = tone === "danger";

  return (
    <div
      style={{
        border: isDanger ? "1px solid #c64532" : "1px solid #d5c9ba",
        borderRadius: "16px",
        padding: "14px",
        background: isDanger ? "#fff1ee" : "#fff"
      }}
    >
      <h4 style={{ margin: "0 0 10px", color: isDanger ? "#c64532" : "#1f1b16" }}>{title}</h4>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[`${poweredLabel} ${poweredCount}`, `${trailerLabel} ${trailerCount}`].map((item) => (
          <span
            key={`${title}-${item}`}
            style={{
              borderRadius: "999px",
              padding: emphasizeCounts ? "8px 12px" : "6px 10px",
              background: isDanger || emphasizeCounts ? "#ffe4df" : "#f8f2eb",
              color: isDanger || emphasizeCounts ? "#c64532" : "#493f35",
              fontWeight: 700,
              fontSize: emphasizeCounts ? "16px" : "13px"
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export type WorkbenchSectionKey =
  | "requirements"
  | "vehicle-config"
  | "load-air-spring"
  | "base-brake"
  | "parking"
  | "calibration"
  | "electric";

type CalibrationMode = "aw3_aw0" | "aw3_aw2";
type ValidationErrorItem = { path: string; message: string };

export function WorkbenchPage({
  loadInputMode,
  controllerConfigType,
  airSpringMassUnit,
  airSpringInputMode,
  baseBrakeCylinderType,
  emergencyRequirementMode,
  fastBrakeEnabled,
  activeSection,
  targetPoweredCount,
  targetTrailerCount,
  targetMixedCount,
  hasMixedBogieVehicles,
  carControllerRows,
  bogieControllerRows,
  onChangeLoadInputMode,
  onChangeAirSpringMassUnit,
  onChangeAirSpringInputMode,
  onChangeBaseBrakeCylinderType,
  onChangeEmergencyRequirementMode,
  onChangeFastBrakeEnabled,
  onChangeSection,
  onChangeCarControllerRows,
  onChangeBogieControllerRows,
  onBackToOverview,
  onDirtyChange,
  onSaveDraft,
  onRunDraft,
  importedYamlText,
  importedFormState,
  importedErrors,
  hasImportedConfig,
  yamlChangedLineIndexes,
  yamlChangedPaths,
}: {
  loadInputMode: "car" | "bogie";
  controllerConfigType: "car" | "bogie";
  airSpringMassUnit: "ton" | "kn";
  airSpringInputMode: "fitted_from_points" | "explicit_linear";
  baseBrakeCylinderType: "tread_cylinder" | "caliper_cylinder";
  emergencyRequirementMode: "a_mean" | "distance";
  fastBrakeEnabled: boolean;
  activeSection: WorkbenchSectionKey;
  targetPoweredCount: number;
  targetTrailerCount: number;
  targetMixedCount: number;
  hasMixedBogieVehicles: boolean;
  carControllerRows: CarControllerRow[];
  bogieControllerRows: BogieControllerRow[];
  onChangeLoadInputMode: (mode: "car" | "bogie") => void;
  onChangeAirSpringMassUnit: (unit: "ton" | "kn") => void;
  onChangeAirSpringInputMode: (mode: "fitted_from_points" | "explicit_linear") => void;
  onChangeBaseBrakeCylinderType: (type: "tread_cylinder" | "caliper_cylinder") => void;
  onChangeEmergencyRequirementMode: (mode: "a_mean" | "distance") => void;
  onChangeFastBrakeEnabled: (enabled: boolean) => void;
  onChangeSection: (section: WorkbenchSectionKey) => void;
  onChangeCarControllerRows: (rows: CarControllerRow[]) => void;
  onChangeBogieControllerRows: (rows: BogieControllerRow[]) => void;
  onBackToOverview: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaveDraft: (draft: Record<string, unknown>) => void;
  onRunDraft: (draft: Record<string, unknown>) => void;
  importedYamlText: string;
  importedFormState: Record<string, unknown> | null;
  importedErrors: ValidationErrorItem[];
  hasImportedConfig: boolean;
  yamlChangedLineIndexes: number[];
  yamlChangedPaths: string[];
}): ReactElement {
  const toRecord = (value: unknown): Record<string, unknown> | null =>
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  const getNestedStringText = (root: unknown, path: string[]): string => {
    let cursor: unknown = root;
    for (const key of path) {
      const record = toRecord(cursor);
      if (record === null || !(key in record)) {
        return "";
      }
      cursor = record[key];
    }
    return typeof cursor === "string" || typeof cursor === "number" ? String(cursor) : "";
  };
  const getNestedNumberText = (root: unknown, path: string[]): string => {
    let cursor: unknown = root;
    for (const key of path) {
      const record = toRecord(cursor);
      if (record === null || !(key in record)) {
        return "";
      }
      cursor = record[key];
    }
    return typeof cursor === "number" ? String(cursor) : "";
  };

  const [v0Value, setV0Value] = useState("");
  const [fsbMeanValue, setFsbMeanValue] = useState("");
  const [fsbT1Value, setFsbT1Value] = useState("");
  const [fsbImpulseRateValue, setFsbImpulseRateValue] = useState("");
  const [ebMeanValue, setEbMeanValue] = useState("");
  const [ebDistanceValue, setEbDistanceValue] = useState("");
  const [ebT1Value, setEbT1Value] = useState("");
  const [ebT2Value, setEbT2Value] = useState("");
  const [muLimitValue, setMuLimitValue] = useState("");
  const [allocationStrategy, setAllocationStrategy] = useState<"equal_wear" | "equal_adhesion">(
    "equal_wear"
  );
  const [speedChecks, setSpeedChecks] = useState<string[]>([]);
  const [ratioBrakes, setRatioBrakes] = useState<Array<{ name: string; ratioPercent: string }>>([
    { name: "holding", ratioPercent: "50" }
  ]);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serviceCalibrationMode, setServiceCalibrationMode] = useState<CalibrationMode>("aw3_aw0");
  const [emergencyCalibrationMode, setEmergencyCalibrationMode] = useState<CalibrationMode>("aw3_aw0");
  const [servicePointOneBrakeType, setServicePointOneBrakeType] = useState<"FSB" | "FB">("FSB");
  const [servicePointTwoBrakeType, setServicePointTwoBrakeType] = useState<"FSB" | "FB">("FB");
  const [massAw0PoweredValue, setMassAw0PoweredValue] = useState("");
  const [massAw0TrailerValue, setMassAw0TrailerValue] = useState("");
  const [massAw3PoweredValue, setMassAw3PoweredValue] = useState("");
  const [massAw3TrailerValue, setMassAw3TrailerValue] = useState("");
  const [bogieWeightPoweredValue, setBogieWeightPoweredValue] = useState("");
  const [bogieWeightTrailerValue, setBogieWeightTrailerValue] = useState("");
  const [airSpringKValue, setAirSpringKValue] = useState("");
  const [airSpringBValue, setAirSpringBValue] = useState("");
  const [airSpringPoint1PressureValue, setAirSpringPoint1PressureValue] = useState("");
  const [airSpringPoint1MassValue, setAirSpringPoint1MassValue] = useState("");
  const [airSpringPoint2PressureValue, setAirSpringPoint2PressureValue] = useState("");
  const [airSpringPoint2MassValue, setAirSpringPoint2MassValue] = useState("");
  const [airSpringPoint3PressureValue, setAirSpringPoint3PressureValue] = useState("");
  const [airSpringPoint3MassValue, setAirSpringPoint3MassValue] = useState("");
  const [mechScValue, setMechScValue] = useState("");
  const [mechXiValue, setMechXiValue] = useState("");
  const [mechLiValue, setMechLiValue] = useState("");
  const [mechEtaIValue, setMechEtaIValue] = useState("");
  const [mechLoValue, setMechLoValue] = useState("");
  const [mechEtaOValue, setMechEtaOValue] = useState("");
  const [mechFs1Value, setMechFs1Value] = useState("");
  const [mechFs2Value, setMechFs2Value] = useState("");
  const [mechDwValue, setMechDwValue] = useState("");
  const [mechRfValue, setMechRfValue] = useState("");
  const [parkingEnabled, setParkingEnabled] = useState(false);
  const [parkingRequiredSafetyMarginValue, setParkingRequiredSafetyMarginValue] = useState("");
  const [parkingStaticFrictionCoefficientValue, setParkingStaticFrictionCoefficientValue] = useState("");
  const [parkingCylindersByCarValue, setParkingCylindersByCarValue] = useState("");
  const [parkingWindSpeedMaxValue, setParkingWindSpeedMaxValue] = useState("");
  const [parkingWindResistanceCoefficientValue, setParkingWindResistanceCoefficientValue] = useState("");
  const [parkingGradeAw0Value, setParkingGradeAw0Value] = useState("");
  const [parkingGradeAw2Value, setParkingGradeAw2Value] = useState("");
  const [parkingGradeAw3Value, setParkingGradeAw3Value] = useState("");
  const [parkingFpValue, setParkingFpValue] = useState("");
  const [parkingFs1Value, setParkingFs1Value] = useState("");
  const [parkingFs2Value, setParkingFs2Value] = useState("");
  const [parkingLpiValue, setParkingLpiValue] = useState("");
  const [parkingEtaPiValue, setParkingEtaPiValue] = useState("");
  const [parkingLoValue, setParkingLoValue] = useState("");
  const [parkingEtaOValue, setParkingEtaOValue] = useState("");
  const [pressureCalibrationEnabled, setPressureCalibrationEnabled] = useState(false);
  const [serviceCalibrationBcp0Value, setServiceCalibrationBcp0Value] = useState("");
  const [serviceCalibrationPointOneKValue, setServiceCalibrationPointOneKValue] = useState("");
  const [serviceCalibrationPointTwoKValue, setServiceCalibrationPointTwoKValue] = useState("");
  const [emergencyCalibrationBcp0Value, setEmergencyCalibrationBcp0Value] = useState("");
  const [emergencyCalibrationPointOneKValue, setEmergencyCalibrationPointOneKValue] = useState("");
  const [emergencyCalibrationPointTwoKValue, setEmergencyCalibrationPointTwoKValue] = useState("");
  const [lastChangedPath, setLastChangedPath] = useState<string | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<"description" | "errors" | "yaml">(
    hasImportedConfig ? "yaml" : "description"
  );

  const sectionErrorPrefixes: Record<WorkbenchSectionKey, string[]> = {
    requirements: ["v0", "V_list", "requirement", "response_time", "brake_types", "adhesion"],
    "vehicle-config": ["vehicle_config", "controller_type", "n_bogies_by_controller", "n_springs_by_controller", "n_cylinders_by_controller"],
    "load-air-spring": ["mass_params", "air_spring", "load_groups"],
    "base-brake": ["mech_params"],
    parking: ["parking_brake_check"],
    calibration: ["pressure_calibration"],
    electric: ["electric_brake"],
  };

  const getSectionErrors = (section: WorkbenchSectionKey): ValidationErrorItem[] => {
    const prefixes = sectionErrorPrefixes[section];
    return importedErrors.filter((error) => prefixes.some((prefix) => error.path.startsWith(prefix)));
  };

  const getStatusLabel = (section: WorkbenchSectionKey): string => {
    const errors = getSectionErrors(section);
    if (errors.length > 0) {
      return `${errors.length} 项错误`;
    }
    const root = importedFormState;
    const has = (path: string[]): boolean => getNestedStringText(root, path).trim().length > 0;
    const hasObject = (path: string[]): boolean => {
      let cursor: unknown = root;
      for (const key of path) {
        const record = toRecord(cursor);
        if (record === null || !(key in record)) return false;
        cursor = record[key];
      }
      return typeof cursor === "object" && cursor !== null;
    };
    const isEnabled = (path: string[]): boolean => {
      let cursor: unknown = root;
      for (const key of path) {
        const record = toRecord(cursor);
        if (record === null || !(key in record)) return false;
        cursor = record[key];
      }
      return typeof cursor === "boolean" && cursor;
    };

    if (section === "requirements") {
      return has(["v0"]) && has(["requirement", "FSB", "value"]) && has(["requirement", "EB", "value"])
        ? "已补充"
        : "待完善";
    }
    if (section === "vehicle-config") return hasObject(["vehicle_config"]) ? "已补充" : "待完善";
    if (section === "load-air-spring")
      return hasObject(["mass_params"]) && hasObject(["air_spring"]) ? "已补充" : "待完善";
    if (section === "base-brake") return hasObject(["mech_params"]) ? "已补充" : "待完善";
    if (section === "parking") return isEnabled(["parking_brake_check", "enabled"]) ? "已补充" : "未补充";
    if (section === "calibration")
      return isEnabled(["pressure_calibration", "enabled"]) ? "已补充" : "未补充";
    return isEnabled(["electric_brake", "enabled"]) ? "已补充" : "未补充";
  };

  const sectionDescriptionMap: Record<WorkbenchSectionKey, string> = {
    requirements: "本章用于确认主制动技术条件：速度、FSB/EB目标、响应时间、全局黏着限制。",
    "vehicle-config": "本章用于确认车辆与控制器实例映射关系，确保编组口径一致。",
    "load-air-spring": "本章用于确认载荷质量、转向架重量与空簧特性输入口径。",
    "base-brake": "本章用于确认基础机械参数与制动缸模型口径。",
    parking: "本章用于补录停放校核配置与环境条件。",
    calibration: "本章用于补录压力标定点与模式。",
    electric: "本章用于补录电制动特性（V1不参与主制动计算）。",
  };

  useEffect(() => {
    if (importedFormState === null) {
      return;
    }
    setV0Value(getNestedStringText(importedFormState, ["v0"]));
    setFsbMeanValue(getNestedStringText(importedFormState, ["requirement", "FSB", "value"]));
    setFsbT1Value(getNestedStringText(importedFormState, ["response_time", "FSB", "t1"]));
    setFsbImpulseRateValue(
      getNestedStringText(importedFormState, ["response_time", "FSB", "impulse_rate"])
    );
    const ebMode = getNestedStringText(importedFormState, ["requirement", "EB", "mode"]);
    if (ebMode === "a_mean" || ebMode === "distance") {
      onChangeEmergencyRequirementMode(ebMode);
    }
    setEbMeanValue(
      ebMode === "a_mean" ? getNestedStringText(importedFormState, ["requirement", "EB", "value"]) : ""
    );
    setEbDistanceValue(
      ebMode === "distance"
        ? getNestedStringText(importedFormState, ["requirement", "EB", "value"])
        : ""
    );
    setEbT1Value(getNestedStringText(importedFormState, ["response_time", "EB", "t1"]));
    setEbT2Value(getNestedStringText(importedFormState, ["response_time", "EB", "t2"]));
    setMuLimitValue(getNestedStringText(importedFormState, ["adhesion", "mu_limit"]));
    const allocation = getNestedStringText(importedFormState, ["allocation_strategy"]);
    if (allocation === "equal_wear" || allocation === "equal_adhesion") {
      setAllocationStrategy(allocation);
    }
    const vListRaw = toRecord(importedFormState)?.V_list;
    if (Array.isArray(vListRaw)) {
      const v0 = getNestedStringText(importedFormState, ["v0"]);
      const speeds = vListRaw
        .filter((item) => typeof item === "number" || typeof item === "string")
        .map((item) => String(item))
        .filter((value) => value !== v0);
      setSpeedChecks(speeds);
    }
    const brakeTypesRaw = toRecord(importedFormState)?.brake_types;
    if (Array.isArray(brakeTypesRaw)) {
      const ratios = brakeTypesRaw
        .map((item) => toRecord(item))
        .filter((item) => item !== null)
        .filter((item) => item.source === "ratio_of_FSB")
        .map((item) => {
          const ratioValue = item.ratio;
          const ratioPercent =
            typeof ratioValue === "number" ? String(Math.round(ratioValue * 100)) : "50";
          return { name: String(item.name ?? "holding"), ratioPercent };
        });
      if (ratios.length > 0) {
        setRatioBrakes(ratios);
      }
      const hasFb = brakeTypesRaw
        .map((item) => toRecord(item))
        .some((item) => item !== null && String(item.name ?? "") === "FB");
      onChangeFastBrakeEnabled(hasFb);
    }
    setMassAw0PoweredValue(
      getNestedNumberText(importedFormState, ["mass_params", "powered_bogie", "mass_static", "AW0"])
    );
    setMassAw0TrailerValue(
      getNestedNumberText(importedFormState, ["mass_params", "trailer_bogie", "mass_static", "AW0"])
    );
    setMassAw3PoweredValue(
      getNestedNumberText(importedFormState, ["mass_params", "powered_bogie", "mass_static", "AW3"])
    );
    setMassAw3TrailerValue(
      getNestedNumberText(importedFormState, ["mass_params", "trailer_bogie", "mass_static", "AW3"])
    );
    setBogieWeightPoweredValue(
      getNestedNumberText(importedFormState, ["mass_params", "powered_bogie", "bogie_weight"])
    );
    setBogieWeightTrailerValue(
      getNestedNumberText(importedFormState, ["mass_params", "trailer_bogie", "bogie_weight"])
    );
    setAirSpringKValue(
      getNestedNumberText(importedFormState, ["air_spring", "powered_bogie", "airspring_k"])
    );
    setAirSpringBValue(
      getNestedNumberText(importedFormState, ["air_spring", "powered_bogie", "airspring_b"])
    );
    const airSpringRoot = toRecord(importedFormState.air_spring);
    const airSpringByType =
      toRecord(airSpringRoot?.powered_bogie) ?? toRecord(airSpringRoot?.trailer_bogie);
    const airSpringMode = airSpringByType?.mode;
    if (airSpringMode === "fitted_from_points" || airSpringMode === "explicit_linear") {
      onChangeAirSpringInputMode(airSpringMode);
    }
    const pointsRaw = Array.isArray(airSpringByType?.points) ? airSpringByType.points : [];
    const normalizePoint = (point: unknown): { pressure: string; mass: string } => {
      if (Array.isArray(point)) {
        const pressure = typeof point[0] === "number" || typeof point[0] === "string" ? String(point[0]) : "";
        const mass = typeof point[1] === "number" || typeof point[1] === "string" ? String(point[1]) : "";
        return { pressure, mass };
      }
      const record = toRecord(point);
      if (record !== null) {
        const pressureValue = record.pressure_kpa;
        const massValue = record.sprung_mass_by_spring_ton;
        return {
          pressure:
            typeof pressureValue === "number" || typeof pressureValue === "string"
              ? String(pressureValue)
              : "",
          mass: typeof massValue === "number" || typeof massValue === "string" ? String(massValue) : "",
        };
      }
      return { pressure: "", mass: "" };
    };
    const point1 = normalizePoint(pointsRaw[0]);
    const point2 = normalizePoint(pointsRaw[1]);
    const point3 = normalizePoint(pointsRaw[2]);
    setAirSpringPoint1PressureValue(point1.pressure);
    setAirSpringPoint1MassValue(point1.mass);
    setAirSpringPoint2PressureValue(point2.pressure);
    setAirSpringPoint2MassValue(point2.mass);
    setAirSpringPoint3PressureValue(point3.pressure);
    setAirSpringPoint3MassValue(point3.mass);
    const mechParams = toRecord(importedFormState.mech_params);
    const cylinderType = mechParams?.cylinder_type;
    if (cylinderType === "tread_cylinder" || cylinderType === "caliper_cylinder") {
      onChangeBaseBrakeCylinderType(cylinderType);
    }
    setMechScValue(getNestedStringText(importedFormState, ["mech_params", "Sc"]));
    setMechXiValue(getNestedStringText(importedFormState, ["mech_params", "xi"]));
    setMechLiValue(getNestedStringText(importedFormState, ["mech_params", "Li"]));
    setMechEtaIValue(getNestedStringText(importedFormState, ["mech_params", "eta_i"]));
    setMechLoValue(getNestedStringText(importedFormState, ["mech_params", "Lo"]));
    setMechEtaOValue(getNestedStringText(importedFormState, ["mech_params", "eta_o"]));
    setMechFs1Value(getNestedStringText(importedFormState, ["mech_params", "Fs1"]));
    setMechFs2Value(getNestedStringText(importedFormState, ["mech_params", "Fs2"]));
    setMechDwValue(getNestedStringText(importedFormState, ["mech_params", "Dw"]));
    setMechRfValue(getNestedStringText(importedFormState, ["mech_params", "Rf"]));
    const parking = toRecord(importedFormState.parking_brake_check);
    setParkingEnabled(parking?.enabled === true);
    setParkingRequiredSafetyMarginValue(
      getNestedStringText(importedFormState, ["parking_brake_check", "required_safety_margin"])
    );
    setParkingStaticFrictionCoefficientValue(
      getNestedStringText(importedFormState, ["parking_brake_check", "static_friction_coefficient"])
    );
    setParkingCylindersByCarValue(
      getNestedStringText(importedFormState, ["parking_brake_check", "n_parking_cylinders_by_car"])
    );
    setParkingWindSpeedMaxValue(
      getNestedStringText(importedFormState, ["parking_brake_check", "environment", "wind_speed_max"])
    );
    setParkingWindResistanceCoefficientValue(
      getNestedStringText(importedFormState, [
        "parking_brake_check",
        "environment",
        "wind_resistance_coefficient",
      ])
    );
    setParkingGradeAw0Value(
      getNestedStringText(importedFormState, ["parking_brake_check", "environment", "grade_by_load_group", "AW0"])
    );
    setParkingGradeAw2Value(
      getNestedStringText(importedFormState, ["parking_brake_check", "environment", "grade_by_load_group", "AW2"])
    );
    setParkingGradeAw3Value(
      getNestedStringText(importedFormState, ["parking_brake_check", "environment", "grade_by_load_group", "AW3"])
    );
    setParkingFpValue(getNestedStringText(importedFormState, ["parking_brake_check", "cylinder", "Fp"]));
    setParkingFs1Value(getNestedStringText(importedFormState, ["parking_brake_check", "cylinder", "Fs1"]));
    setParkingFs2Value(getNestedStringText(importedFormState, ["parking_brake_check", "cylinder", "Fs2"]));
    setParkingLpiValue(getNestedStringText(importedFormState, ["parking_brake_check", "cylinder", "Lpi"]));
    setParkingEtaPiValue(getNestedStringText(importedFormState, ["parking_brake_check", "cylinder", "eta_pi"]));
    setParkingLoValue(getNestedStringText(importedFormState, ["parking_brake_check", "cylinder", "Lo"]));
    setParkingEtaOValue(getNestedStringText(importedFormState, ["parking_brake_check", "cylinder", "eta_o"]));
    const pressureCalibration = toRecord(importedFormState.pressure_calibration);
    setPressureCalibrationEnabled(pressureCalibration?.enabled === true);
    const serviceBrake = toRecord(pressureCalibration?.service_brake);
    const emergencyBrake = toRecord(pressureCalibration?.emergency_brake);
    const serviceMode = serviceBrake?.point_pair_mode;
    const serviceModeForLookup: CalibrationMode = serviceMode === "aw3_aw2" ? "aw3_aw2" : "aw3_aw0";
    if (serviceMode === "aw3_aw0" || serviceMode === "aw3_aw2") {
      setServiceCalibrationMode(serviceMode);
    }
    const emergencyMode = emergencyBrake?.point_pair_mode;
    const emergencyModeForLookup: CalibrationMode =
      emergencyMode === "aw3_aw2" ? "aw3_aw2" : "aw3_aw0";
    if (emergencyMode === "aw3_aw0" || emergencyMode === "aw3_aw2") {
      setEmergencyCalibrationMode(emergencyMode);
    }
    setServiceCalibrationBcp0Value(getNestedStringText(importedFormState, ["pressure_calibration", "service_brake", "BCP0"]));
    setEmergencyCalibrationBcp0Value(getNestedStringText(importedFormState, ["pressure_calibration", "emergency_brake", "BCP0"]));
    const servicePoints = Array.isArray(serviceBrake?.points) ? serviceBrake.points : [];
    const emergencyPoints = Array.isArray(emergencyBrake?.points) ? emergencyBrake.points : [];
    const servicePointOne = toRecord(servicePoints.find((point) => toRecord(point)?.load_group === "AW3")) ?? toRecord(servicePoints[0]);
    const servicePointTwo = toRecord(
      servicePoints.find((point) => toRecord(point)?.load_group === (serviceModeForLookup === "aw3_aw0" ? "AW0" : "AW2"))
    ) ?? toRecord(servicePoints.find((point) => toRecord(point)?.load_group !== "AW3")) ?? toRecord(servicePoints[1]);
    const emergencyPointOne = toRecord(emergencyPoints.find((point) => toRecord(point)?.load_group === "AW3")) ?? toRecord(emergencyPoints[0]);
    const emergencyPointTwo = toRecord(
      emergencyPoints.find((point) => toRecord(point)?.load_group === (emergencyModeForLookup === "aw3_aw0" ? "AW0" : "AW2"))
    ) ?? toRecord(emergencyPoints.find((point) => toRecord(point)?.load_group !== "AW3")) ?? toRecord(emergencyPoints[1]);
    if (servicePointOne?.brake_type === "FSB" || servicePointOne?.brake_type === "FB") {
      setServicePointOneBrakeType(servicePointOne.brake_type);
    }
    if (servicePointTwo?.brake_type === "FSB" || servicePointTwo?.brake_type === "FB") {
      setServicePointTwoBrakeType(servicePointTwo.brake_type);
    }
    setServiceCalibrationPointOneKValue(
      typeof servicePointOne?.k_for_code === "number" ? String(servicePointOne.k_for_code) : ""
    );
    setServiceCalibrationPointTwoKValue(
      typeof servicePointTwo?.k_for_code === "number" ? String(servicePointTwo.k_for_code) : ""
    );
    setEmergencyCalibrationPointOneKValue(
      typeof emergencyPointOne?.k_for_code === "number" ? String(emergencyPointOne.k_for_code) : ""
    );
    setEmergencyCalibrationPointTwoKValue(
      typeof emergencyPointTwo?.k_for_code === "number" ? String(emergencyPointTwo.k_for_code) : ""
    );
  }, [
    importedFormState,
    onChangeAirSpringInputMode,
    onChangeBaseBrakeCylinderType,
    onChangeEmergencyRequirementMode,
    onChangeFastBrakeEnabled,
  ]);

  const compactSpeedBlockStyle = {
    width: "25%",
    minWidth: "150px",
    display: "grid",
    gap: "8px"
  } as const;

  const markTouched = (fieldKey: string): void => {
    setTouchedFields((current) => ({ ...current, [fieldKey]: true }));
  };

  const parsePositiveNumberError = (value: string): string | undefined => {
    if (value.trim() === "" || Number.isNaN(Number(value)) || Number(value) <= 0) {
      return "请输入大于 0 的数值";
    }
    return undefined;
  };

  const parsePositiveIntegerError = (value: string): string | undefined => {
    if (!/^[1-9]\d*$/.test(value.trim())) {
      return "请输入正整数";
    }
    return undefined;
  };

  const ratioNameSet = useMemo(() => {
    const counts = new Map<string, number>();
    ratioBrakes.forEach((row) => {
      const key = row.name.trim();
      if (key) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });
    return counts;
  }, [ratioBrakes]);

  const fieldErrors = useMemo(() => {
    const errors: Record<string, string | undefined> = {};

    errors.v0 = parsePositiveIntegerError(v0Value);
    errors.fsbMean = parsePositiveNumberError(fsbMeanValue);
    errors.fsbT1 = parsePositiveNumberError(fsbT1Value);
    errors.fsbImpulseRate = parsePositiveNumberError(fsbImpulseRateValue);
    errors.ebModeValue =
      emergencyRequirementMode === "a_mean"
        ? parsePositiveNumberError(ebMeanValue)
        : parsePositiveNumberError(ebDistanceValue);
    errors.ebT1 = parsePositiveNumberError(ebT1Value);
    errors.ebT2 = parsePositiveNumberError(ebT2Value);
    errors.muLimit = parsePositiveNumberError(muLimitValue);

    speedChecks.forEach((value, index) => {
      const integerError = parsePositiveIntegerError(value);
      if (integerError) {
        errors[`speed-${index}`] = integerError;
        return;
      }

      if (/^[1-9]\d*$/.test(v0Value.trim()) && Number(value) > Number(v0Value)) {
        errors[`speed-${index}`] = "待校核速度不能超过最高速度 v0";
      }
    });

    ratioBrakes.forEach((row, index) => {
      const trimmedName = row.name.trim();
      if (!/^[A-Za-z0-9_]+$/.test(trimmedName)) {
        errors[`ratio-name-${index}`] = "仅支持英文、数字、下划线";
      } else if ((ratioNameSet.get(trimmedName) ?? 0) > 1) {
        errors[`ratio-name-${index}`] = "制动类型代号不可重复";
      }

      if (!/^(100|[1-9]\d?)$/.test(row.ratioPercent.trim())) {
        errors[`ratio-percent-${index}`] = "请输入 1 到 100 的整数";
      }
    });

    return errors;
  }, [
    ebDistanceValue,
    ebMeanValue,
    ebT1Value,
    ebT2Value,
    emergencyRequirementMode,
    fsbImpulseRateValue,
    fsbMeanValue,
    fsbT1Value,
    muLimitValue,
    ratioBrakes,
    ratioNameSet,
    speedChecks,
    v0Value
  ]);

  const fieldHints = useMemo(() => {
    const hints: Record<string, string | undefined> = {};
    if (!fieldErrors.muLimit && muLimitValue.trim() !== "" && Number(muLimitValue) >= 0.3) {
      hints.muLimit = "通常应小于 0.3，请确认输入是否正确";
    }
    return hints;
  }, [fieldErrors.muLimit, muLimitValue]);

  const shouldShowFieldFeedback = (fieldKey: string): boolean => submitAttempted || touchedFields[fieldKey] === true;
  const handleAttemptSubmit = (): void => {
    setSubmitAttempted(true);
    onDirtyChange(false);
  };
  const handleSave = (): void => {
    setSubmitAttempted(true);
    onSaveDraft(liveFormState);
    onDirtyChange(false);
  };
  const handleRun = (): void => {
    setSubmitAttempted(true);
    onRunDraft(liveFormState);
    onDirtyChange(false);
  };

  const updateSpeedCheck = (index: number, value: string): void => {
    setSpeedChecks((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const deleteSpeedCheck = (index: number): void => {
    setSpeedChecks((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addSpeedCheck = (): void => {
    setSpeedChecks((current) => [...current, ""]);
  };

  const updateRatioBrake = (
    index: number,
    field: "name" | "ratioPercent",
    value: string
  ): void => {
    setRatioBrakes((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const addRatioBrake = (): void => {
    setRatioBrakes((current) => {
      const nextIndex = current.length + 1;
      return [...current, { name: `holding_${nextIndex}`, ratioPercent: "50" }];
    });
  };

  const yamlFormStateMismatchMessages = useMemo(() => {
    const root = toRecord(importedFormState);
    const hasTopLevelYamlKey = (key: string): boolean => {
      const pattern = new RegExp(`(^|\\n)\\s*${key}\\s*:`, "m");
      return pattern.test(importedYamlText);
    };
    const checks: Array<{ key: string; label: string }> = [
      { key: "controller_type", label: "controller_type" },
      { key: "vehicle_config", label: "vehicle_config" },
      { key: "air_spring", label: "air_spring" },
      { key: "mech_params", label: "mech_params" },
    ];
    return checks
      .filter((item) => hasTopLevelYamlKey(item.key) && (root === null || !(item.key in root)))
      .map(
        (item) =>
          `字段 ${item.label} 在 YAML 中存在，但未进入 form_state。请检查导入校验/归一化链路或当前版本数据来源。`
      );
  }, [importedFormState, importedYamlText]);

  const inferPathFromAriaLabel = (label: string): string | null => {
    const exactMap: Record<string, string> = {
      "最高速度 v0 (km/h)": "v0",
      "最大常用制动平均减速度要求 (m/s²)": "requirement.FSB.value",
      "冲击率 impulse_rate (m/s³)": "response_time.FSB.impulse_rate",
      "紧急制动平均减速度要求 (m/s²)": "requirement.EB.value",
      "紧急制动距离要求 (m)": "requirement.EB.value",
      "紧急制动响应时间 t2 (s)": "response_time.EB.t2",
      "黏着利用限制 mu_limit (-)": "adhesion.mu_limit",
      "AW0 / 动车称重（整车）": "mass_params.powered_bogie.mass_static.AW0",
      "AW0 / 拖车称重（整车）": "mass_params.trailer_bogie.mass_static.AW0",
      "AW3 / 动车称重（整车）": "mass_params.powered_bogie.mass_static.AW3",
      "AW3 / 拖车称重（整车）": "mass_params.trailer_bogie.mass_static.AW3",
      "动车转向架重量 bogie_weight (ton)": "mass_params.powered_bogie.bogie_weight",
      "拖车转向架重量 bogie_weight (ton)": "mass_params.trailer_bogie.bogie_weight",
      "空簧线性系数 k (kPa/ton)": "air_spring.powered_bogie.airspring_k",
      "空簧截距 b (kPa)": "air_spring.powered_bogie.airspring_b",
      "活塞有效面积 Sc (m²)": "mech_params.Sc",
      "摩擦系数 xi (-)": "mech_params.xi",
      "单元内部倍率 Li (-)": "mech_params.Li",
      "单元内部效率 eta_i (-)": "mech_params.eta_i",
      "外部倍率 Lo (-)": "mech_params.Lo",
      "外部效率 eta_o (-)": "mech_params.eta_o",
      "单元复位力 Fs1 (kN)":
        activeSection === "parking" ? "parking_brake_check.cylinder.Fs1" : "mech_params.Fs1",
      "单元复位力 Fs2 (kN)":
        activeSection === "parking" ? "parking_brake_check.cylinder.Fs2" : "mech_params.Fs2",
      "轮径 Dw (m)": "mech_params.Dw",
      "摩擦半径 Rf (m)": "mech_params.Rf",
      "要求安全系数 required_safety_margin (-)": "parking_brake_check.required_safety_margin",
      "静摩擦系数 xi0 / static_friction_coefficient (-)": "parking_brake_check.static_friction_coefficient",
      "每车停放缸数量 n_parking_cylinders_by_car (-)": "parking_brake_check.n_parking_cylinders_by_car",
      "最大风速 wind_speed_max (m/s)": "parking_brake_check.environment.wind_speed_max",
      "风阻系数 wind_resistance_coefficient (-)": "parking_brake_check.environment.wind_resistance_coefficient",
      "AW0 坡度 grade_by_load_group.AW0 (‰)": "parking_brake_check.environment.grade_by_load_group.AW0",
      "AW2 坡度 grade_by_load_group.AW2 (‰)": "parking_brake_check.environment.grade_by_load_group.AW2",
      "AW3 坡度 grade_by_load_group.AW3 (‰)": "parking_brake_check.environment.grade_by_load_group.AW3",
      "停放弹簧输出力 Fp (kN)": "parking_brake_check.cylinder.Fp",
      "停放缸内部倍率 Lpi (-)": "parking_brake_check.cylinder.Lpi",
      "停放缸内部效率 eta_pi (-)": "parking_brake_check.cylinder.eta_pi",
      "执行机构外部倍率 Lo (-)":
        activeSection === "parking" ? "parking_brake_check.cylinder.Lo" : "mech_params.Lo",
      "执行机构外部效率 eta_o (-)": "parking_brake_check.cylinder.eta_o",
      "常用实设出闸压力 BCP0 (kPa)": "pressure_calibration.service_brake.BCP0",
      "常用试验点1 k_for_code": "pressure_calibration.service_brake.points.k_for_code",
      "常用试验点2 k_for_code": "pressure_calibration.service_brake.points.k_for_code",
      "紧急实设出闸压力 BCP0 (kPa)": "pressure_calibration.emergency_brake.BCP0",
      "紧急试验点1 k_for_code": "pressure_calibration.emergency_brake.points.k_for_code",
      "紧急试验点2 k_for_code": "pressure_calibration.emergency_brake.points.k_for_code",
    };
    if (label in exactMap) {
      return exactMap[label];
    }
    if (label.startsWith("待校核速度 ")) {
      return "V_list";
    }
    if (label === "压力 (kPa)") {
      return "air_spring.powered_bogie.points";
    }
    if (label === "质量 (ton)" || label === "质量 (kN)") {
      return "air_spring.powered_bogie.points";
    }
    if (label.startsWith("制动类型代号")) {
      return "brake_types";
    }
    if (label.startsWith("相对最大常用制动比例")) {
      return "brake_types";
    }
    if (label.startsWith("实例名称 ")) {
      return controllerConfigType === "car" ? "vehicle_config.cars" : "vehicle_config.bogies";
    }
    if (label === "制动类型") {
      return "pressure_calibration.service_brake.points";
    }
    return null;
  };

  const liveFormState = useMemo<Record<string, unknown>>(() => {
    const root = toRecord(importedFormState) ?? {};
    const toNumberOrUndefined = (value: string): number | undefined =>
      value.trim() === "" ? undefined : Number(value);
    const v0Number = toNumberOrUndefined(v0Value);
    const extraSpeeds = speedChecks
      .map((value) => toNumberOrUndefined(value))
      .filter((value): value is number => value !== undefined);
    const vList = v0Number === undefined ? extraSpeeds : [...extraSpeeds, v0Number];
    const requirementEbValue =
      emergencyRequirementMode === "a_mean"
        ? toNumberOrUndefined(ebMeanValue)
        : toNumberOrUndefined(ebDistanceValue);
    const ratioBrakeTypes = ratioBrakes
      .map((item) => ({
        name: item.name.trim(),
        source: "ratio_of_FSB" as const,
        ratio: toNumberOrUndefined(item.ratioPercent) === undefined ? undefined : Number(item.ratioPercent) / 100,
      }))
      .filter((item) => item.name.length > 0 && item.ratio !== undefined);
    const airSpringPoints = [
      [toNumberOrUndefined(airSpringPoint1PressureValue), toNumberOrUndefined(airSpringPoint1MassValue)],
      [toNumberOrUndefined(airSpringPoint2PressureValue), toNumberOrUndefined(airSpringPoint2MassValue)],
      [toNumberOrUndefined(airSpringPoint3PressureValue), toNumberOrUndefined(airSpringPoint3MassValue)],
    ]
      .filter((point) => point[0] !== undefined && point[1] !== undefined)
      .map((point) => ({
        pressure_kpa: point[0] as number,
        sprung_mass_by_spring_ton: point[1] as number,
      }));
    return {
      ...root,
      v0: v0Number ?? root.v0,
      V_list: vList.length > 0 ? vList : root.V_list,
      allocation_strategy: allocationStrategy,
      brake_types: [
        { name: "FSB", source: "kinematic" },
        { name: "EB", source: "kinematic" },
        ...(fastBrakeEnabled ? [{ name: "FB", source: "kinematic" as const }] : []),
        ...ratioBrakeTypes,
      ],
      requirement: {
        FSB: {
          mode: "a_mean",
          value: toNumberOrUndefined(fsbMeanValue),
        },
        EB: {
          mode: emergencyRequirementMode,
          value: requirementEbValue,
        },
      },
      response_time: {
        FSB: {
          t1: toNumberOrUndefined(fsbT1Value),
          impulse_rate: toNumberOrUndefined(fsbImpulseRateValue),
        },
        EB: {
          t1: toNumberOrUndefined(ebT1Value),
          t2: toNumberOrUndefined(ebT2Value),
        },
      },
      adhesion: {
        ...(toRecord(root.adhesion) ?? {}),
        mu_limit: toNumberOrUndefined(muLimitValue),
      },
      mass_params: {
        ...(toRecord(root.mass_params) ?? {}),
        powered_bogie: {
          ...(toRecord(toRecord(root.mass_params)?.powered_bogie) ?? {}),
          mass_static: {
            ...(toRecord(toRecord(toRecord(root.mass_params)?.powered_bogie)?.mass_static) ?? {}),
            AW0: toNumberOrUndefined(massAw0PoweredValue),
            AW3: toNumberOrUndefined(massAw3PoweredValue),
          },
          bogie_weight: toNumberOrUndefined(bogieWeightPoweredValue),
        },
        trailer_bogie: {
          ...(toRecord(toRecord(root.mass_params)?.trailer_bogie) ?? {}),
          mass_static: {
            ...(toRecord(toRecord(toRecord(root.mass_params)?.trailer_bogie)?.mass_static) ?? {}),
            AW0: toNumberOrUndefined(massAw0TrailerValue),
            AW3: toNumberOrUndefined(massAw3TrailerValue),
          },
          bogie_weight: toNumberOrUndefined(bogieWeightTrailerValue),
        },
      },
      air_spring: {
        ...(toRecord(root.air_spring) ?? {}),
        powered_bogie: {
          ...(toRecord(toRecord(root.air_spring)?.powered_bogie) ?? {}),
          mode: airSpringInputMode,
          airspring_k: toNumberOrUndefined(airSpringKValue),
          airspring_b: toNumberOrUndefined(airSpringBValue),
          points: airSpringInputMode === "fitted_from_points" ? airSpringPoints : undefined,
        },
        trailer_bogie: {
          ...(toRecord(toRecord(root.air_spring)?.trailer_bogie) ?? {}),
          mode: airSpringInputMode,
          airspring_k: toNumberOrUndefined(airSpringKValue),
          airspring_b: toNumberOrUndefined(airSpringBValue),
          points: airSpringInputMode === "fitted_from_points" ? airSpringPoints : undefined,
        },
      },
      mech_params: {
        ...(toRecord(root.mech_params) ?? {}),
        cylinder_type: baseBrakeCylinderType,
        Sc: toNumberOrUndefined(mechScValue),
        xi: toNumberOrUndefined(mechXiValue),
        Li: toNumberOrUndefined(mechLiValue),
        eta_i: toNumberOrUndefined(mechEtaIValue),
        Lo: toNumberOrUndefined(mechLoValue),
        eta_o: toNumberOrUndefined(mechEtaOValue),
        Fs1: toNumberOrUndefined(mechFs1Value),
        Fs2: toNumberOrUndefined(mechFs2Value),
        Dw: toNumberOrUndefined(mechDwValue),
        Rf: toNumberOrUndefined(mechRfValue),
      },
      pressure_calibration: {
        ...(toRecord(root.pressure_calibration) ?? {}),
        enabled: pressureCalibrationEnabled,
        service_brake: {
          ...(toRecord(toRecord(root.pressure_calibration)?.service_brake) ?? {}),
          BCP0: toNumberOrUndefined(serviceCalibrationBcp0Value),
          point_pair_mode: serviceCalibrationMode,
          points: [
            {
              load_group: "AW3",
              brake_type: servicePointOneBrakeType,
              k_for_code: toNumberOrUndefined(serviceCalibrationPointOneKValue),
            },
            {
              load_group: serviceCalibrationMode === "aw3_aw0" ? "AW0" : "AW2",
              brake_type: servicePointTwoBrakeType,
              k_for_code: toNumberOrUndefined(serviceCalibrationPointTwoKValue),
            },
          ],
        },
        emergency_brake:
          controllerConfigType === "bogie"
            ? {
                ...(toRecord(toRecord(root.pressure_calibration)?.emergency_brake) ?? {}),
                BCP0: toNumberOrUndefined(emergencyCalibrationBcp0Value),
                point_pair_mode: emergencyCalibrationMode,
                points: [
                  {
                    load_group: "AW3",
                    brake_type: "EB",
                    k_for_code: toNumberOrUndefined(emergencyCalibrationPointOneKValue),
                  },
                  {
                    load_group: emergencyCalibrationMode === "aw3_aw0" ? "AW0" : "AW2",
                    brake_type: "EB",
                    k_for_code: toNumberOrUndefined(emergencyCalibrationPointTwoKValue),
                  },
                ],
              }
            : (toRecord(toRecord(root.pressure_calibration)?.emergency_brake) ?? undefined),
      },
      parking_brake_check: {
        ...(toRecord(root.parking_brake_check) ?? {}),
        enabled: parkingEnabled,
        required_safety_margin:
          parkingRequiredSafetyMarginValue.trim() === ""
            ? undefined
            : Number(parkingRequiredSafetyMarginValue),
        static_friction_coefficient:
          parkingStaticFrictionCoefficientValue.trim() === ""
            ? undefined
            : Number(parkingStaticFrictionCoefficientValue),
        n_parking_cylinders_by_car:
          parkingCylindersByCarValue.trim() === "" ? undefined : Number(parkingCylindersByCarValue),
        environment: {
          ...(toRecord(toRecord(root.parking_brake_check)?.environment) ?? {}),
          wind_speed_max: toNumberOrUndefined(parkingWindSpeedMaxValue),
          wind_resistance_coefficient: toNumberOrUndefined(parkingWindResistanceCoefficientValue),
          grade_by_load_group: {
            ...(toRecord(toRecord(toRecord(root.parking_brake_check)?.environment)?.grade_by_load_group) ?? {}),
            AW0: toNumberOrUndefined(parkingGradeAw0Value),
            AW2: toNumberOrUndefined(parkingGradeAw2Value),
            AW3: toNumberOrUndefined(parkingGradeAw3Value),
          },
        },
        cylinder: {
          ...(toRecord(toRecord(root.parking_brake_check)?.cylinder) ?? {}),
          Fp: toNumberOrUndefined(parkingFpValue),
          Fs1: toNumberOrUndefined(parkingFs1Value),
          Fs2: toNumberOrUndefined(parkingFs2Value),
          Lpi: toNumberOrUndefined(parkingLpiValue),
          eta_pi: toNumberOrUndefined(parkingEtaPiValue),
          Lo: toNumberOrUndefined(parkingLoValue),
          eta_o: toNumberOrUndefined(parkingEtaOValue),
        },
      },
    };
  }, [
    airSpringBValue,
    airSpringInputMode,
    airSpringKValue,
    airSpringPoint1MassValue,
    airSpringPoint1PressureValue,
    airSpringPoint2MassValue,
    airSpringPoint2PressureValue,
    airSpringPoint3MassValue,
    airSpringPoint3PressureValue,
    allocationStrategy,
    baseBrakeCylinderType,
    bogieWeightPoweredValue,
    bogieWeightTrailerValue,
    controllerConfigType,
    ebDistanceValue,
    emergencyCalibrationBcp0Value,
    emergencyCalibrationMode,
    emergencyCalibrationPointOneKValue,
    emergencyCalibrationPointTwoKValue,
    ebMeanValue,
    ebT1Value,
    ebT2Value,
    emergencyRequirementMode,
    fastBrakeEnabled,
    fsbImpulseRateValue,
    fsbMeanValue,
    fsbT1Value,
    importedFormState,
    massAw0PoweredValue,
    massAw0TrailerValue,
    massAw3PoweredValue,
    massAw3TrailerValue,
    mechDwValue,
    mechEtaIValue,
    mechEtaOValue,
    mechFs1Value,
    mechFs2Value,
    mechLiValue,
    mechLoValue,
    mechRfValue,
    mechScValue,
    mechXiValue,
    muLimitValue,
    parkingCylindersByCarValue,
    parkingEnabled,
    parkingEtaOValue,
    parkingEtaPiValue,
    parkingFpValue,
    parkingFs1Value,
    parkingFs2Value,
    parkingGradeAw0Value,
    parkingGradeAw2Value,
    parkingGradeAw3Value,
    parkingLpiValue,
    parkingLoValue,
    parkingRequiredSafetyMarginValue,
    parkingStaticFrictionCoefficientValue,
    parkingWindResistanceCoefficientValue,
    parkingWindSpeedMaxValue,
    pressureCalibrationEnabled,
    ratioBrakes,
    serviceCalibrationBcp0Value,
    serviceCalibrationMode,
    serviceCalibrationPointOneKValue,
    serviceCalibrationPointTwoKValue,
    servicePointOneBrakeType,
    servicePointTwoBrakeType,
    speedChecks,
    v0Value,
  ]);

  const highlightedJson = useMemo(() => {
    const lines = JSON.stringify(liveFormState, null, 2).split("\n");
    if (lastChangedPath === null) {
      return lines.map((line) => ({ line, highlighted: false }));
    }
    const parts = lastChangedPath.split(".");
    let depth = 0;
    const stack: string[] = [];
    let highlightIndex = -1;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (trimmed === "}" || trimmed === "}," || trimmed === "]" || trimmed === "],") {
        while (stack.length > depth) {
          stack.pop();
        }
        depth = Math.max(depth - 1, 0);
        continue;
      }

      const keyMatch = trimmed.match(/^"([^"]+)":\s*(.*)$/);
      if (keyMatch === null) {
        continue;
      }
      const key = keyMatch[1];
      const valuePortion = keyMatch[2];
      const currentPath = [...stack.slice(0, depth), key];

      if (currentPath.join(".") === lastChangedPath) {
        highlightIndex = index;
        break;
      }

      const opensObject = valuePortion === "{" || valuePortion === "[";
      if (opensObject) {
        stack[depth] = key;
        depth += 1;
      }
    }

    if (highlightIndex < 0) {
      const fallbackKey = parts[parts.length - 1];
      const fallbackPattern = `"${fallbackKey}"`;
      highlightIndex = lines.findIndex((line) => line.includes(fallbackPattern));
    }
    return lines.map((line, index) => ({ line, highlighted: index === highlightIndex }));
  }, [lastChangedPath, liveFormState]);

  const highlightedLineIndex = useMemo(() => {
    const index = highlightedJson.findIndex((item) => item.highlighted);
    return index >= 0 ? index : null;
  }, [highlightedJson]);

  useEffect(() => {
    if (highlightedLineIndex === null) {
      return;
    }
    const target = document.querySelector(`[data-json-line="${highlightedLineIndex}"]`);
    if (target instanceof HTMLElement && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [highlightedLineIndex]);

  const effectiveControllerConfigType = useMemo<"car" | "bogie">(() => {
    const root = toRecord(importedFormState);
    const rawType = root?.controller_type;
    if (rawType === "car" || rawType === "bogie") {
      return rawType;
    }
    const vehicleConfig = toRecord(root?.vehicle_config);
    if (Array.isArray(vehicleConfig?.bogies) && (vehicleConfig.bogies as unknown[]).length > 0) {
      return "bogie";
    }
    if (Array.isArray(vehicleConfig?.cars) && (vehicleConfig.cars as unknown[]).length > 0) {
      return "car";
    }
    return controllerConfigType;
  }, [controllerConfigType, importedFormState]);

  const importedTargetSummary = useMemo(() => {
    if (!hasImportedConfig) {
      return null;
    }
    const root = toRecord(importedFormState);
    if (root === null) {
      return null;
    }
    const vehicleConfig = toRecord(root.vehicle_config);
    if (vehicleConfig === null) {
      return null;
    }
    if (effectiveControllerConfigType === "car") {
      const cars = Array.isArray(vehicleConfig.cars) ? vehicleConfig.cars : [];
      let targetPowered = 0;
      let targetTrailer = 0;
      cars
        .map((item) => toRecord(item))
        .filter((item) => item !== null)
        .forEach((item) => {
          if (item.car_type === "powered_car") {
            targetPowered += 1;
          } else if (item.car_type === "trailer_car") {
            targetTrailer += 1;
          }
        });
      if (targetPowered === 0 && targetTrailer === 0) {
        return null;
      }
      return {
        targetPowered,
        targetTrailer,
      };
    }
    const bogies = Array.isArray(vehicleConfig.bogies) ? vehicleConfig.bogies : [];
    let targetPowered = 0;
    let targetTrailer = 0;
    bogies
      .map((item) => toRecord(item))
      .filter((item) => item !== null)
      .forEach((item) => {
        if (item.bogie_type === "powered_bogie") {
          targetPowered += 1;
        } else if (item.bogie_type === "trailer_bogie") {
          targetTrailer += 1;
        }
      });
    if (targetPowered === 0 && targetTrailer === 0) {
      return null;
    }
    return {
      targetPowered,
      targetTrailer,
    };
  }, [effectiveControllerConfigType, hasImportedConfig, importedFormState]);

  const vehicleCountSummary =
    effectiveControllerConfigType === "car"
      ? {
          targetPowered: importedTargetSummary?.targetPowered ?? targetPoweredCount,
          targetTrailer: importedTargetSummary?.targetTrailer ?? targetTrailerCount,
          currentPowered: carControllerRows.filter((row) => row.type === "powered_car").length,
          currentTrailer: carControllerRows.filter((row) => row.type === "trailer_car").length,
          poweredLabel: "动车",
          trailerLabel: "拖车",
          scopeLabel: "车控：每个控制器对应 1 辆车 / 2 个转向架 / 4 个空簧 / 8 个制动缸"
        }
      : {
          targetPowered:
            importedTargetSummary?.targetPowered ?? targetPoweredCount * 2 + targetMixedCount,
          targetTrailer:
            importedTargetSummary?.targetTrailer ?? targetTrailerCount * 2 + targetMixedCount,
          currentPowered: bogieControllerRows.filter((row) => row.type === "powered_bogie").length,
          currentTrailer: bogieControllerRows.filter((row) => row.type === "trailer_bogie").length,
          poweredLabel: "动架",
          trailerLabel: "拖架",
          scopeLabel: "架控：每个控制器对应 1 个转向架 / 2 个空簧 / 4 个制动缸"
        };
  const vehicleCountMatches =
    vehicleCountSummary.currentPowered === vehicleCountSummary.targetPowered &&
    vehicleCountSummary.currentTrailer === vehicleCountSummary.targetTrailer;

  const updateCarControllerName = (index: number, name: string): void => {
    onChangeCarControllerRows(
      carControllerRows.map((row, rowIndex) => (rowIndex === index ? { ...row, name } : row))
    );
  };

  const updateBogieControllerName = (index: number, name: string): void => {
    onChangeBogieControllerRows(
      bogieControllerRows.map((row, rowIndex) => (rowIndex === index ? { ...row, name } : row))
    );
  };

  const updateCarControllerType = (index: number, type: CarControllerRow["type"]): void => {
    onChangeCarControllerRows(
      carControllerRows.map((row, rowIndex) =>
        rowIndex === index ? { name: `${type}_${index + 1}`, type } : row
      )
    );
  };

  const updateBogieControllerType = (index: number, type: BogieControllerRow["type"]): void => {
    onChangeBogieControllerRows(
      bogieControllerRows.map((row, rowIndex) =>
        rowIndex === index ? { name: `${type}_${index + 1}`, type } : row
      )
    );
  };

  return (
    <div
      style={{ display: "grid", gap: "18px" }}
      onChangeCapture={(event) => {
        onDirtyChange(true);
        const target = event.target as HTMLElement;
        const label = target.getAttribute("aria-label");
        if (typeof label === "string") {
          const path = inferPathFromAriaLabel(label);
          if (path !== null) {
            setLastChangedPath(path);
          }
        }
      }}
    >
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "32px" }}>配置工作台</h2>
            <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
              当前按左侧章节逐块确认 V1 输入契约，先完成主制动计算，再补录后置校核内容。
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" style={ghostActionStyle} onClick={onBackToOverview}>
              返回总览
            </button>
            <button type="button" style={ghostActionStyle}>
              下载 YAML
            </button>
            <button type="button" style={secondaryActionStyle} onClick={handleSave}>
              保存
            </button>
            <button type="button" style={primaryActionStyle} onClick={handleRun}>
              运行
            </button>
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 300px",
          gap: "18px"
        }}
      >
        <aside style={panelStyle}>
          <NavSection
            title="主配置"
            items={[
              {
                label: "运行基础配置 / 技术条件",
                status: getStatusLabel("requirements"),
                active: activeSection === "requirements",
                onSelect: () => onChangeSection("requirements")
              },
              {
                label: "车辆与控制器配置",
                status: getStatusLabel("vehicle-config"),
                active: activeSection === "vehicle-config",
                onSelect: () => onChangeSection("vehicle-config")
              },
              {
                label: "载荷与空簧",
                status: getStatusLabel("load-air-spring"),
                active: activeSection === "load-air-spring",
                onSelect: () => onChangeSection("load-air-spring")
              },
              {
                label: "基础制动机械参数",
                status: getStatusLabel("base-brake"),
                active: activeSection === "base-brake",
                onSelect: () => onChangeSection("base-brake")
              }
            ]}
          />
          <NavSection
            title="后置补录"
            items={[
              {
                label: "停放校核",
                status: getStatusLabel("parking"),
                active: activeSection === "parking",
                onSelect: () => onChangeSection("parking")
              },
              {
                label: "标定",
                status: getStatusLabel("calibration"),
                active: activeSection === "calibration",
                onSelect: () => onChangeSection("calibration")
              }
            ]}
          />
        </aside>

        <div style={{ display: "grid", gap: "18px" }}>
          {activeSection === "requirements" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>运行基础配置 / 技术条件</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                本章只放主制动计算的技术条件目标和全局约束。停放校核的线路坡度、风速、风阻和停放缸参数在后置补录中维护。
              </p>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>最大常用制动</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock
                      label="最大常用制动平均减速度要求 (m/s²)"
                      value={fsbMeanValue}
                      onChange={(value) => {
                        setFsbMeanValue(value);
                        setLastChangedPath("requirement.FSB.value");
                      }}
                      onBlur={() => markTouched("fsbMean")}
                      placeholder="例如 1.00"
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("fsbMean") ? fieldErrors.fsbMean : undefined}
                    />
                    <FieldBlock
                      label="空走时间 t1 (s)"
                      value={fsbT1Value}
                      onChange={(value) => {
                        setFsbT1Value(value);
                        setLastChangedPath("response_time.FSB.t1");
                      }}
                      onBlur={() => markTouched("fsbT1")}
                      placeholder="例如 0.70"
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("fsbT1") ? fieldErrors.fsbT1 : undefined}
                    />
                    <FieldBlock
                      label="冲击率 impulse_rate (m/s³)"
                      value={fsbImpulseRateValue}
                      onChange={(value) => {
                        setFsbImpulseRateValue(value);
                        setLastChangedPath("response_time.FSB.impulse_rate");
                      }}
                      onBlur={() => markTouched("fsbImpulseRate")}
                      placeholder="例如 0.75"
                      inputMode="decimal"
                      error={
                        shouldShowFieldFeedback("fsbImpulseRate") ? fieldErrors.fsbImpulseRate : undefined
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>不同初速度下的制动距离校核要求</h4>
                  <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                    `V_list` 用于结果页输出不同初速度下的理论制动距离校核。最高速度 `v0` 默认参与校核，额外速度可按需要添加。
                  </p>
                  <div style={{ maxWidth: "360px", marginBottom: "12px" }}>
                    <FieldBlock
                      label="最高速度 v0 (km/h)"
                      value={v0Value}
                      onChange={(value) => {
                        setV0Value(value);
                        setLastChangedPath("v0");
                      }}
                      onBlur={() => markTouched("v0")}
                      placeholder="例如 120"
                      inputMode="numeric"
                      error={shouldShowFieldFeedback("v0") ? fieldErrors.v0 : undefined}
                    />
                  </div>
                  <p style={{ margin: "0 0 12px", color: "#6b6259", lineHeight: 1.6 }}>
                    最高速度 v0 默认参与校核；这里只追加 `V_list` 里的其他待校核速度。
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                    {speedChecks.map((value, index) => (
                      <div key={`speed-check-${index}`} style={compactSpeedBlockStyle}>
                        <FieldBlock
                          label={`待校核速度 ${index + 1} (km/h)`}
                          value={value}
                          onChange={(nextValue) => {
                            updateSpeedCheck(index, nextValue);
                            setLastChangedPath("V_list");
                          }}
                          onBlur={() => markTouched(`speed-${index}`)}
                          placeholder="例如 80"
                          inputMode="numeric"
                          error={
                            shouldShowFieldFeedback(`speed-${index}`)
                              ? fieldErrors[`speed-${index}`]
                              : undefined
                          }
                        />
                        <button
                          type="button"
                          style={ghostActionStyle}
                          onClick={() => deleteSpeedCheck(index)}
                        >
                          {`删除待校核速度 ${index + 1}`}
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" style={secondaryActionStyle} onClick={addSpeedCheck}>
                    添加待校核速度
                  </button>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>紧急制动</h4>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <TogglePill
                      label="按平均减速度录入"
                      active={emergencyRequirementMode === "a_mean"}
                      onClick={() => {
                        onChangeEmergencyRequirementMode("a_mean");
                        setLastChangedPath("requirement.EB.mode");
                      }}
                    />
                    <TogglePill
                      label="按制动距离录入"
                      active={emergencyRequirementMode === "distance"}
                      onClick={() => {
                        onChangeEmergencyRequirementMode("distance");
                        setLastChangedPath("requirement.EB.mode");
                      }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock
                      label={
                        emergencyRequirementMode === "a_mean"
                          ? "紧急制动平均减速度要求 (m/s²)"
                          : "紧急制动距离要求 (m)"
                      }
                      value={emergencyRequirementMode === "a_mean" ? ebMeanValue : ebDistanceValue}
                      onChange={(value) => {
                        if (emergencyRequirementMode === "a_mean") {
                          setEbMeanValue(value);
                        } else {
                          setEbDistanceValue(value);
                        }
                        setLastChangedPath("requirement.EB.value");
                      }}
                      onBlur={() => markTouched("ebModeValue")}
                      placeholder={emergencyRequirementMode === "a_mean" ? "例如 1.10" : "例如 320"}
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("ebModeValue") ? fieldErrors.ebModeValue : undefined}
                    />
                    <FieldBlock
                      label="空走时间 t1 (s)"
                      value={ebT1Value}
                      onChange={(value) => {
                        setEbT1Value(value);
                        setLastChangedPath("response_time.EB.t1");
                      }}
                      onBlur={() => markTouched("ebT1")}
                      placeholder="例如 0.40"
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("ebT1") ? fieldErrors.ebT1 : undefined}
                    />
                    <FieldBlock
                      label="紧急制动响应时间 t2 (s)"
                      value={ebT2Value}
                      onChange={(value) => {
                        setEbT2Value(value);
                        setLastChangedPath("response_time.EB.t2");
                      }}
                      onBlur={() => markTouched("ebT2")}
                      placeholder="例如 0.80"
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("ebT2") ? fieldErrors.ebT2 : undefined}
                    />
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>快速制动</h4>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <TogglePill
                      label="启用快速制动"
                      active={fastBrakeEnabled}
                      onClick={() => onChangeFastBrakeEnabled(!fastBrakeEnabled)}
                    />
                  </div>
                  <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>
                    快速制动控制目标跟随紧急制动；响应时间与最大常用制动完全一致，导出 `input.yaml` 时直接复用 FSB 的 `t1` 和 `impulse_rate`。
                  </p>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>常用制动分配方式</h4>
                  <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                    用于配置最大常用制动及按其比例定义的自定义制动类型所采用的分配方式。
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <TogglePill
                      label="等磨耗"
                      active={allocationStrategy === "equal_wear"}
                      onClick={() => setAllocationStrategy("equal_wear")}
                    />
                    <TogglePill
                      label="等黏着"
                      active={allocationStrategy === "equal_adhesion"}
                      onClick={() => setAllocationStrategy("equal_adhesion")}
                    />
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>其他制动类型</h4>
                  <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                    用于添加自定义制动类型。
                  </p>
                  <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
                    {ratioBrakes.map((row, index) => (
                      <div
                        key={`ratio-brake-${index}`}
                        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
                      >
                        <FieldBlock
                          label={
                            index === 0
                              ? "制动类型代号"
                              : `制动类型代号 ${index + 1}`
                          }
                          value={row.name}
                          onChange={(nextValue) => updateRatioBrake(index, "name", nextValue)}
                          onBlur={() => markTouched(`ratio-name-${index}`)}
                          placeholder={index === 0 ? "例如 holding" : `例如 holding_${index + 1}`}
                          error={
                            shouldShowFieldFeedback(`ratio-name-${index}`)
                              ? fieldErrors[`ratio-name-${index}`]
                              : undefined
                          }
                        />
                        <FieldBlock
                          label={
                            index === 0
                              ? "相对最大常用制动比例 (%)"
                              : `相对最大常用制动比例 ${index + 1} (%)`
                          }
                          value={row.ratioPercent}
                          onChange={(nextValue) => updateRatioBrake(index, "ratioPercent", nextValue)}
                          onBlur={() => markTouched(`ratio-percent-${index}`)}
                          placeholder="例如 50"
                          inputMode="numeric"
                          suffix="%"
                          error={
                            shouldShowFieldFeedback(`ratio-percent-${index}`)
                              ? fieldErrors[`ratio-percent-${index}`]
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <button type="button" style={secondaryActionStyle} onClick={addRatioBrake}>
                    添加制动类型
                  </button>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>全局黏着限制</h4>
                  <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                    `adhesion.mu_limit` 是全局黏着限制，供黏着校核和分配策略自动切换使用，不属于停放校核输入。
                  </p>
                  <FieldBlock
                    label="黏着利用限制 mu_limit (-)"
                    value={muLimitValue}
                    onChange={setMuLimitValue}
                    onBlur={() => markTouched("muLimit")}
                    placeholder="例如 0.20"
                    inputMode="decimal"
                    error={shouldShowFieldFeedback("muLimit") ? fieldErrors.muLimit : undefined}
                    hint={shouldShowFieldFeedback("muLimit") ? fieldHints.muLimit : undefined}
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection === "vehicle-config" && (
            <>
              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>实例确认与调整</h3>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  初始化向导会先生成首版 `vehicle_config`。这一页只负责确认和微调实例，不承担从零创建实例的主流程。
                </p>
                <InfoCard
                  title="本页目标"
                  body="确认初始化生成的控制器实例是否符合项目编组，再决定是否需要调整名称、类型或个别实例。"
                />
              </section>

              <section style={panelStyle}>
                <h4 style={{ marginTop: 0 }}>控制器实例列表</h4>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  当前 BCU 类型：{effectiveControllerConfigType === "car" ? "车控" : "架控"}。这里仅调整实例名称和动/拖类型；控制器数量来自初始化编组，调整后需要核对总数。
                </p>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  {vehicleCountSummary.scopeLabel}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                    marginBottom: "16px"
                  }}
                >
                  <CountCard
                    title={hasImportedConfig ? "导入基准编组" : "目标编组"}
                    poweredLabel={vehicleCountSummary.poweredLabel}
                    poweredCount={vehicleCountSummary.targetPowered}
                    trailerLabel={vehicleCountSummary.trailerLabel}
                    trailerCount={vehicleCountSummary.targetTrailer}
                  />
                  <CountCard
                    title="当前编组"
                    poweredLabel={vehicleCountSummary.poweredLabel}
                    poweredCount={vehicleCountSummary.currentPowered}
                    trailerLabel={vehicleCountSummary.trailerLabel}
                    trailerCount={vehicleCountSummary.currentTrailer}
                    tone={vehicleCountMatches ? "neutral" : "danger"}
                    emphasizeCounts={effectiveControllerConfigType === "bogie" && hasMixedBogieVehicles}
                  />
                  <div
                    style={{
                      border: vehicleCountMatches ? "1px solid #d5c9ba" : "1px solid #c64532",
                      borderRadius: "16px",
                      padding: "14px",
                      background: vehicleCountMatches ? "#fff" : "#fff1ee"
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 8px",
                        color: vehicleCountMatches ? "#1f1b16" : "#c64532"
                      }}
                    >
                      编组校核
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        color: vehicleCountMatches ? "#6b6259" : "#c64532",
                        lineHeight: 1.5
                      }}
                    >
                      {vehicleCountMatches ? "编组校核通过，与初始化目标一致。" : "编组校核需确认，当前动/拖数量与初始化目标不一致。"}
                    </p>
                  </div>
                </div>
                <div style={{ display: "grid", gap: "12px" }}>
                  {effectiveControllerConfigType === "car"
                    ? carControllerRows.map((row, index) => (
                        <div
                          key={`car-controller-${index}`}
                          style={{
                            border: "1px solid #d5c9ba",
                            borderRadius: "16px",
                            padding: "16px",
                            background: "#fff",
                            display: "grid",
                            gap: "12px"
                          }}
                        >
                          <strong>{`控制器实例 ${index + 1}`}</strong>
                          <FieldBlock
                            label={`实例名称 ${index + 1}`}
                            value={row.name}
                            onChange={(value) => updateCarControllerName(index, value)}
                          />
                          <div>
                            <strong style={{ fontSize: "14px" }}>车辆类型</strong>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
                              <TogglePill
                                label={`实例 ${index + 1} 设为拖车`}
                                active={row.type === "trailer_car"}
                                onClick={() => updateCarControllerType(index, "trailer_car")}
                              />
                              <TogglePill
                                label={`实例 ${index + 1} 设为动车`}
                                active={row.type === "powered_car"}
                                onClick={() => updateCarControllerType(index, "powered_car")}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    : bogieControllerRows.map((row, index) => (
                        <div
                          key={`bogie-controller-${index}`}
                          style={{
                            border: "1px solid #d5c9ba",
                            borderRadius: "16px",
                            padding: "16px",
                            background: "#fff",
                            display: "grid",
                            gap: "12px"
                          }}
                        >
                          <strong>{`控制器实例 ${index + 1}`}</strong>
                          <FieldBlock
                            label={`实例名称 ${index + 1}`}
                            value={row.name}
                            onChange={(value) => updateBogieControllerName(index, value)}
                          />
                          <div>
                            <strong style={{ fontSize: "14px" }}>转向架类型</strong>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
                              <TogglePill
                                label={`实例 ${index + 1} 设为拖架`}
                                active={row.type === "trailer_bogie"}
                                onClick={() => updateBogieControllerType(index, "trailer_bogie")}
                              />
                              <TogglePill
                                label={`实例 ${index + 1} 设为动架`}
                                active={row.type === "powered_bogie"}
                                onClick={() => updateBogieControllerType(index, "powered_bogie")}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                </div>
              </section>
            </>
          )}

          {activeSection === "load-air-spring" && (
            <>
              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>载荷与空簧</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
                  <InfoCard title="本章状态" body="当前已完成大部分质量参数录入，仍需确认口径切换和空簧单位。" />
                  <InfoCard title="本章说明" body="这一页用于组织车辆载荷、转向架参数与空簧特性，是最主要的防错区。" />
                </div>
              </section>

              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>车辆载荷参数录入</h3>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  根据当前录入口径，字段名称会同步切换，避免把整车称重和架称重混在一起。
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <TogglePill
                    label="按整车录入（推荐）"
                    active={loadInputMode === "car"}
                    onClick={() => onChangeLoadInputMode("car")}
                  />
                  <TogglePill
                    label="按转向架录入"
                    active={loadInputMode === "bogie"}
                    onClick={() => onChangeLoadInputMode("bogie")}
                  />
                </div>
                <div style={{ display: "grid", gap: "12px" }}>
                  <FieldBlock
                    label={`AW0 / ${loadInputMode === "car" ? "动车称重（整车）" : "动架称重"}`}
                    value={massAw0PoweredValue}
                    onChange={setMassAw0PoweredValue}
                  />
                  <FieldBlock
                    label={`AW0 / ${loadInputMode === "car" ? "拖车称重（整车）" : "拖架称重"}`}
                    value={massAw0TrailerValue}
                    onChange={setMassAw0TrailerValue}
                  />
                  <FieldBlock
                    label={`AW3 / ${loadInputMode === "car" ? "动车称重（整车）" : "动架称重"}`}
                    value={massAw3PoweredValue}
                    onChange={setMassAw3PoweredValue}
                  />
                  <FieldBlock
                    label={`AW3 / ${loadInputMode === "car" ? "拖车称重（整车）" : "拖架称重"}`}
                    value={massAw3TrailerValue}
                    onChange={setMassAw3TrailerValue}
                  />
                </div>
              </section>

              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>转向架参数录入</h3>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  `bogie_weight` 始终按单个转向架口径录入，本区同时承担车辆称重口径和架称重口径的关系说明。
                </p>
                <div style={{ display: "grid", gap: "12px" }}>
                  <FieldBlock
                    label="动车转向架重量 bogie_weight (ton)"
                    value={bogieWeightPoweredValue}
                    onChange={setBogieWeightPoweredValue}
                  />
                  <FieldBlock
                    label="拖车转向架重量 bogie_weight (ton)"
                    value={bogieWeightTrailerValue}
                    onChange={setBogieWeightTrailerValue}
                  />
                </div>
              </section>

              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>空簧特性输入</h3>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  先选输入模式，再录入对应字段。特征点模式下压力和质量必须分成两个字段；显式公式模式则直接录入空簧线性公式。
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <TogglePill
                    label="特征点拟合"
                    active={airSpringInputMode === "fitted_from_points"}
                    onClick={() => onChangeAirSpringInputMode("fitted_from_points")}
                  />
                  <TogglePill
                    label="显式线性公式"
                    active={airSpringInputMode === "explicit_linear"}
                    onClick={() => onChangeAirSpringInputMode("explicit_linear")}
                  />
                </div>
                <div
                  style={{
                    border: "1px solid #d9c8b5",
                    borderRadius: "16px",
                    background: "#fff6ee",
                    padding: "16px",
                    marginBottom: "16px"
                  }}
                >
                  <strong>单位提示</strong>
                  <p style={{ margin: "8px 0 12px", color: "#6b6259", lineHeight: 1.6 }}>
                    {airSpringInputMode === "fitted_from_points"
                      ? "当前为特征点拟合模式。压力轴单位为 `kPa`，质量轴可按 `ton / kN` 切换。若资料提供的是 `kN`，前端仅做辅助换算后再回到权威输入口径。"
                      : "当前为显式线性公式模式。请直接录入 pressure_kpa = k * sprung_mass_by_spring_ton + b 中的 k 与 b，公式口径保持 `kPa/ton` 和 `kPa`。"}
                  </p>
                  {airSpringInputMode === "fitted_from_points" ? (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <TogglePill
                        label="质量单位：ton"
                        active={airSpringMassUnit === "ton"}
                        onClick={() => onChangeAirSpringMassUnit("ton")}
                      />
                      <TogglePill
                        label="质量单位：kN（前端辅助换算）"
                        active={airSpringMassUnit === "kn"}
                        onClick={() => onChangeAirSpringMassUnit("kn")}
                      />
                    </div>
                  ) : null}
                </div>
                {airSpringInputMode === "fitted_from_points" ? (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <PointRow
                      unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"}
                      index={1}
                      pressureValue={airSpringPoint1PressureValue}
                      massValue={airSpringPoint1MassValue}
                      onChangePressure={setAirSpringPoint1PressureValue}
                      onChangeMass={setAirSpringPoint1MassValue}
                    />
                    <PointRow
                      unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"}
                      index={2}
                      pressureValue={airSpringPoint2PressureValue}
                      massValue={airSpringPoint2MassValue}
                      onChangePressure={setAirSpringPoint2PressureValue}
                      onChangeMass={setAirSpringPoint2MassValue}
                    />
                    <PointRow
                      unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"}
                      index={3}
                      pressureValue={airSpringPoint3PressureValue}
                      massValue={airSpringPoint3MassValue}
                      onChangePressure={setAirSpringPoint3PressureValue}
                      onChangeMass={setAirSpringPoint3MassValue}
                    />
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "16px" }}>
                    <div
                      style={{
                        border: "1px solid #d5c9ba",
                        borderRadius: "16px",
                        padding: "16px",
                        background: "#fff"
                      }}
                    >
                      <h4 style={{ margin: "0 0 12px" }}>公式口径说明</h4>
                      <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>
                        当前直接录入单条直线公式 `pressure_kpa = k * sprung_mass_by_spring_ton + b`。其中 `sprung_mass_by_spring_ton` 为单个空簧承担的簧上质量口径。
                      </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <FieldBlock
                        label="空簧线性系数 k (kPa/ton)"
                        value={airSpringKValue}
                        onChange={setAirSpringKValue}
                      />
                      <FieldBlock
                        label="空簧截距 b (kPa)"
                        value={airSpringBValue}
                        onChange={setAirSpringBValue}
                      />
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {activeSection === "base-brake" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>基础制动机械参数</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                本章只处理 `mech_params`，重点是把单位写清楚，并避免把停放缸参数和控制器数量参数混进来。
              </p>
              <div
                style={{
                  border: "1px solid #d9c8b5",
                  borderRadius: "16px",
                  background: "#fff6ee",
                  padding: "16px",
                  marginBottom: "16px"
                }}
              >
                <strong>单位提示</strong>
                <p style={{ margin: "8px 0 0", color: "#6b6259", lineHeight: 1.6 }}>
                  本章优先确认 `m² / m / kN / -` 等单位。停放缸参数不在本章，制动缸数量和空簧数量放到“车辆与控制器配置”中确认。
                </p>
              </div>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>基础制动缸参数</h4>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <TogglePill
                      label="踏面制动 tread_cylinder"
                      active={baseBrakeCylinderType === "tread_cylinder"}
                      onClick={() => onChangeBaseBrakeCylinderType("tread_cylinder")}
                    />
                    <TogglePill
                      label="制动夹钳 caliper_cylinder"
                      active={baseBrakeCylinderType === "caliper_cylinder"}
                      onClick={() => onChangeBaseBrakeCylinderType("caliper_cylinder")}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock label="活塞有效面积 Sc (m²)" value={mechScValue} onChange={setMechScValue} />
                    <FieldBlock label="摩擦系数 xi (-)" value={mechXiValue} onChange={setMechXiValue} />
                    <FieldBlock label="单元内部倍率 Li (-)" value={mechLiValue} onChange={setMechLiValue} />
                    <FieldBlock label="单元内部效率 eta_i (-)" value={mechEtaIValue} onChange={setMechEtaIValue} />
                    <FieldBlock label="外部倍率 Lo (-)" value={mechLoValue} onChange={setMechLoValue} />
                    <FieldBlock label="外部效率 eta_o (-)" value={mechEtaOValue} onChange={setMechEtaOValue} />
                    <FieldBlock label="单元复位力 Fs1 (kN)" value={mechFs1Value} onChange={setMechFs1Value} />
                    <FieldBlock label="单元复位力 Fs2 (kN)" value={mechFs2Value} onChange={setMechFs2Value} />
                  </div>
                </div>

                {baseBrakeCylinderType === "caliper_cylinder" ? (
                  <div
                    style={{
                      border: "1px solid #d5c9ba",
                      borderRadius: "16px",
                      padding: "16px",
                      background: "#fff"
                    }}
                  >
                    <h4 style={{ margin: "0 0 12px" }}>夹钳制动几何参数</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <FieldBlock label="轮径 Dw (m)" value={mechDwValue} onChange={setMechDwValue} />
                      <FieldBlock label="摩擦半径 Rf (m)" value={mechRfValue} onChange={setMechRfValue} />
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {activeSection === "parking" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>停放校核</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                本章作为后置补录章节，只录入 `parking_brake_check` 输入。`F_N_PB`、`F_PB` 和整列汇总结果在结果页查看。
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                <TogglePill
                  label="启用 parking_brake_check"
                  active={parkingEnabled}
                  onClick={() => {
                    setParkingEnabled(true);
                    onDirtyChange(true);
                    setLastChangedPath("parking_brake_check.enabled");
                  }}
                />
                <TogglePill
                  label="停用 parking_brake_check"
                  active={!parkingEnabled}
                  onClick={() => {
                    setParkingEnabled(false);
                    onDirtyChange(true);
                    setLastChangedPath("parking_brake_check.enabled");
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", marginBottom: "16px" }}>
                <InfoCard
                  title={parkingEnabled ? "当前状态：已补充停放校核" : "当前状态：未补充停放校核"}
                  body={
                    parkingEnabled
                      ? "当前版本已录入停放校核配置与参数，运行后可在结果页查看校核结果。"
                      : "当前版本尚未录入线路坡度和停放参数，运行结果中仅保留待补录状态。"
                  }
                />
                <InfoCard title="补录提示" body="先补校核配置和环境条件，再确认停放缸输入参数，完成后重新运行并在结果页查看校核结果。" />
              </div>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>校核配置</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock
                      label="要求安全系数 required_safety_margin (-)"
                      value={parkingRequiredSafetyMarginValue}
                      onChange={setParkingRequiredSafetyMarginValue}
                    />
                    <FieldBlock
                      label="静摩擦系数 xi0 / static_friction_coefficient (-)"
                      value={parkingStaticFrictionCoefficientValue}
                      onChange={setParkingStaticFrictionCoefficientValue}
                    />
                    <FieldBlock
                      label="每车停放缸数量 n_parking_cylinders_by_car (-)"
                      value={parkingCylindersByCarValue}
                      onChange={setParkingCylindersByCarValue}
                    />
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>环境条件</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock
                      label="最大风速 wind_speed_max (m/s)"
                      value={parkingWindSpeedMaxValue}
                      onChange={setParkingWindSpeedMaxValue}
                    />
                    <FieldBlock
                      label="风阻系数 wind_resistance_coefficient (-)"
                      value={parkingWindResistanceCoefficientValue}
                      onChange={setParkingWindResistanceCoefficientValue}
                    />
                    <FieldBlock
                      label="AW0 坡度 grade_by_load_group.AW0 (‰)"
                      value={parkingGradeAw0Value}
                      onChange={setParkingGradeAw0Value}
                    />
                    <FieldBlock
                      label="AW2 坡度 grade_by_load_group.AW2 (‰)"
                      value={parkingGradeAw2Value}
                      onChange={setParkingGradeAw2Value}
                    />
                    <FieldBlock
                      label="AW3 坡度 grade_by_load_group.AW3 (‰)"
                      value={parkingGradeAw3Value}
                      onChange={setParkingGradeAw3Value}
                    />
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>停放缸参数</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock label="停放弹簧输出力 Fp (kN)" value={parkingFpValue} onChange={setParkingFpValue} />
                    <FieldBlock label="单元复位力 Fs1 (kN)" value={parkingFs1Value} onChange={setParkingFs1Value} />
                    <FieldBlock label="单元复位力 Fs2 (kN)" value={parkingFs2Value} onChange={setParkingFs2Value} />
                    <FieldBlock label="停放缸内部倍率 Lpi (-)" value={parkingLpiValue} onChange={setParkingLpiValue} />
                    <FieldBlock label="停放缸内部效率 eta_pi (-)" value={parkingEtaPiValue} onChange={setParkingEtaPiValue} />
                    <FieldBlock label="执行机构外部倍率 Lo (-)" value={parkingLoValue} onChange={setParkingLoValue} />
                    <FieldBlock label="执行机构外部效率 eta_o (-)" value={parkingEtaOValue} onChange={setParkingEtaOValue} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "calibration" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>标定</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                本页录入的是试验点驱动的实设系数，不是直接录入完整 k(f) 分段曲线。
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                <TogglePill
                  label="启用 pressure_calibration"
                  active={pressureCalibrationEnabled}
                  onClick={() => {
                    setPressureCalibrationEnabled(true);
                    onDirtyChange(true);
                    setLastChangedPath("pressure_calibration.enabled");
                  }}
                />
                <TogglePill
                  label="停用 pressure_calibration"
                  active={!pressureCalibrationEnabled}
                  onClick={() => {
                    setPressureCalibrationEnabled(false);
                    onDirtyChange(true);
                    setLastChangedPath("pressure_calibration.enabled");
                  }}
                />
              </div>
              <div style={{ display: "grid", gap: "16px" }}>
                <CalibrationConfigCard
                  title="常用控制系数标定"
                  status={pressureCalibrationEnabled ? "当前状态：已配置" : "当前状态：未配置"}
                  summary="常用与快速制动共用同一组 pressure_calibration.service_brake；先选择当前点对模式，再补录两条试验点。"
                  mode={serviceCalibrationMode}
                  onChangeMode={(mode) => {
                    setServiceCalibrationMode(mode);
                    onDirtyChange(true);
                    setLastChangedPath("pressure_calibration.service_brake.point_pair_mode");
                  }}
                  pressureLabel="实设出闸压力"
                  pressureAriaLabel="常用实设出闸压力 BCP0 (kPa)"
                  pressureValue={serviceCalibrationBcp0Value}
                  onChangePressureValue={(value) => {
                    setServiceCalibrationBcp0Value(value);
                    setLastChangedPath("pressure_calibration.service_brake.BCP0");
                  }}
                  showBrakeTypeSelect={true}
                  firstPointLoadGroup="AW3"
                  secondPointLoadGroup={serviceCalibrationMode === "aw3_aw0" ? "AW0" : "AW2"}
                  firstPointBrakeType={servicePointOneBrakeType}
                  secondPointBrakeType={servicePointTwoBrakeType}
                  firstPointKAriaLabel="常用试验点1 k_for_code"
                  secondPointKAriaLabel="常用试验点2 k_for_code"
                  firstPointKValue={serviceCalibrationPointOneKValue}
                  secondPointKValue={serviceCalibrationPointTwoKValue}
                  onChangeFirstPointBrakeType={(value) => {
                    setServicePointOneBrakeType(value === "FB" ? "FB" : "FSB");
                    onDirtyChange(true);
                    setLastChangedPath("pressure_calibration.service_brake.points.brake_type");
                  }}
                  onChangeSecondPointBrakeType={(value) => {
                    setServicePointTwoBrakeType(value === "FB" ? "FB" : "FSB");
                    onDirtyChange(true);
                    setLastChangedPath("pressure_calibration.service_brake.points.brake_type");
                  }}
                  onChangeFirstPointKValue={(value) => {
                    setServiceCalibrationPointOneKValue(value);
                    setLastChangedPath("pressure_calibration.service_brake.points.k_for_code");
                  }}
                  onChangeSecondPointKValue={(value) => {
                    setServiceCalibrationPointTwoKValue(value);
                    setLastChangedPath("pressure_calibration.service_brake.points.k_for_code");
                  }}
                />
                {effectiveControllerConfigType === "bogie" ? (
                  <CalibrationConfigCard
                    title="紧急控制系数标定"
                    status={pressureCalibrationEnabled ? "当前状态：已配置" : "当前状态：未配置"}
                    summary="紧急制动标定仅用于架控项目，对应 pressure_calibration.emergency_brake；每个试验点的 brake_type 固定为 EB。"
                    mode={emergencyCalibrationMode}
                    onChangeMode={(mode) => {
                      setEmergencyCalibrationMode(mode);
                      onDirtyChange(true);
                      setLastChangedPath("pressure_calibration.emergency_brake.point_pair_mode");
                    }}
                    pressureLabel="实设出闸压力"
                    pressureAriaLabel="紧急实设出闸压力 BCP0 (kPa)"
                    pressureValue={emergencyCalibrationBcp0Value}
                    onChangePressureValue={(value) => {
                      setEmergencyCalibrationBcp0Value(value);
                      setLastChangedPath("pressure_calibration.emergency_brake.BCP0");
                    }}
                    showBrakeTypeSelect={false}
                    firstPointLoadGroup="AW3"
                    secondPointLoadGroup={emergencyCalibrationMode === "aw3_aw0" ? "AW0" : "AW2"}
                    firstPointBrakeType="EB"
                    secondPointBrakeType="EB"
                    firstPointKAriaLabel="紧急试验点1 k_for_code"
                    secondPointKAriaLabel="紧急试验点2 k_for_code"
                    firstPointKValue={emergencyCalibrationPointOneKValue}
                    secondPointKValue={emergencyCalibrationPointTwoKValue}
                    onChangeFirstPointKValue={(value) => {
                      setEmergencyCalibrationPointOneKValue(value);
                      setLastChangedPath("pressure_calibration.emergency_brake.points.k_for_code");
                    }}
                    onChangeSecondPointKValue={(value) => {
                      setEmergencyCalibrationPointTwoKValue(value);
                      setLastChangedPath("pressure_calibration.emergency_brake.points.k_for_code");
                    }}
                  />
                ) : (
                  <InfoCard
                    title="车控紧急制动标定限制"
                    body="V1.0 暂不支持车控紧急制动的压力标定。当前 EB 结果仍使用理论压力计算结果，紧急制动的压力调整需要人工在计算报告中手动调整。"
                  />
                )}
              </div>
            </section>
          )}

          {activeSection === "electric" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>电制动特性</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                当前仅做输入补录和摘要展示，不参与 V1 主制动计算。
              </p>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>电制动曲线</h4>
                  <div
                    style={{
                      minHeight: "180px",
                      borderRadius: "14px",
                      border: "1px dashed #ccbca8",
                      background:
                        "linear-gradient(180deg, rgba(184,100,45,0.08) 0%, rgba(184,100,45,0.02) 100%)",
                      padding: "16px",
                      display: "grid",
                      alignItems: "end"
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        display: "grid",
                        alignItems: "end",
                        color: "#6b6259"
                      }}
                    >
                      曲线预览区：用于查看速度与电制动力关系，帮助快速判断电机特性。
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>特性点表</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock label="速度 (km/h)" />
                    <FieldBlock label="电制动力 (kN)" />
                    <FieldBlock label="速度 (km/h)" />
                    <FieldBlock label="电制动力 (kN)" />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>说明</h3>
          <ActiveInfoTabs activeTab={activeInfoTab} onChangeTab={setActiveInfoTab} />
          {activeInfoTab === "description" ? (
            <div style={{ display: "grid", gap: "12px" }}>
              <InfoCard title="当前章节说明" body={sectionDescriptionMap[activeSection]} />
              <InfoCard title="待确认项" body={`当前章节状态：${getStatusLabel(activeSection)}。`} />
            </div>
          ) : null}
          {activeInfoTab === "errors" ? (
            getSectionErrors(activeSection).length > 0 ? (
              <div style={{ display: "grid", gap: "8px" }}>
                {getSectionErrors(activeSection).map((error, index) => (
                  <InfoCard key={`${error.path}-${index}`} title={error.path} body={error.message} />
                ))}
              </div>
            ) : (
              <InfoCard title="错误" body="当前章节暂无校验错误。" />
            )
          ) : null}
          {activeInfoTab === "yaml" ? (
            <div style={{ display: "grid", gap: "12px" }}>
              <InfoCard title="导入配置回显" body={hasImportedConfig ? "已显示导入 YAML 与 form_state。" : "当前没有导入配置，显示默认内容。"} />
              {yamlFormStateMismatchMessages.length > 0 ? (
                <div style={{ display: "grid", gap: "8px" }}>
                  {yamlFormStateMismatchMessages.map((message, index) => (
                    <InfoCard key={`yaml-form-mismatch-${index}`} title="YAML / form_state 不一致" body={message} />
                  ))}
                </div>
              ) : null}
              <div
                style={{
                  border: "1px solid #d5c9ba",
                  borderRadius: "12px",
                  background: "#fff",
                  padding: "12px",
                  fontFamily: "Consolas, monospace",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {importedYamlText.split(/\r?\n/).map((line, index) => (
                  <div
                    key={`yaml-line-${index}`}
                    style={
                      yamlChangedLineIndexes.includes(index)
                        ? { color: "#c64532", fontWeight: 700 }
                        : undefined
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
              <div
                style={{
                  border: "1px solid #d5c9ba",
                  borderRadius: "12px",
                  background: "#fff",
                  padding: "12px",
                  fontFamily: "Consolas, monospace",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {highlightedJson.map((item, index) => (
                  <div
                    key={`json-line-${index}`}
                    data-json-line={index}
                    data-testid={item.highlighted ? "last-changed-path" : undefined}
                    style={item.highlighted ? { color: "#c64532", fontWeight: 700 } : undefined}
                  >
                    {item.line}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
