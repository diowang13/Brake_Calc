import { useMemo, useState, type ReactElement } from "react";

import {
  ghostActionStyle,
  panelStyle,
  primaryActionStyle,
  secondaryActionStyle
} from "../app/styles";
import {
  ActiveInfoTabs,
  CalibrationCaseCard,
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
  onBackToOverview
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
}): ReactElement {
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

  const vehicleCountSummary =
    controllerConfigType === "car"
      ? {
          targetPowered: targetPoweredCount,
          targetTrailer: targetTrailerCount,
          currentPowered: carControllerRows.filter((row) => row.type === "powered_car").length,
          currentTrailer: carControllerRows.filter((row) => row.type === "trailer_car").length,
          poweredLabel: "动车",
          trailerLabel: "拖车",
          scopeLabel: "车控：每个控制器对应 1 辆车 / 2 个转向架 / 4 个空簧 / 8 个制动缸"
        }
      : {
          targetPowered: targetPoweredCount * 2 + targetMixedCount,
          targetTrailer: targetTrailerCount * 2 + targetMixedCount,
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
    <div style={{ display: "grid", gap: "18px" }}>
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
            <button type="button" style={secondaryActionStyle} onClick={handleAttemptSubmit}>
              保存
            </button>
            <button type="button" style={primaryActionStyle} onClick={handleAttemptSubmit}>
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
                status: "已完成",
                active: activeSection === "requirements",
                onSelect: () => onChangeSection("requirements")
              },
              {
                label: "车辆与控制器配置",
                status: "待验收",
                active: activeSection === "vehicle-config",
                onSelect: () => onChangeSection("vehicle-config")
              },
              {
                label: "载荷与空簧",
                status: "2 项待确认",
                active: activeSection === "load-air-spring",
                onSelect: () => onChangeSection("load-air-spring")
              },
              {
                label: "基础制动机械参数",
                status: "1 项错误",
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
                status: "未开始",
                active: activeSection === "parking",
                onSelect: () => onChangeSection("parking")
              },
              {
                label: "标定",
                status: "未开始",
                active: activeSection === "calibration",
                onSelect: () => onChangeSection("calibration")
              },
              {
                label: "电空计算",
                status: "未开始",
                active: activeSection === "electric",
                onSelect: () => onChangeSection("electric")
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
                      onChange={setFsbMeanValue}
                      onBlur={() => markTouched("fsbMean")}
                      placeholder="例如 1.00"
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("fsbMean") ? fieldErrors.fsbMean : undefined}
                    />
                    <FieldBlock
                      label="空走时间 t1 (s)"
                      value={fsbT1Value}
                      onChange={setFsbT1Value}
                      onBlur={() => markTouched("fsbT1")}
                      placeholder="例如 0.70"
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("fsbT1") ? fieldErrors.fsbT1 : undefined}
                    />
                    <FieldBlock
                      label="冲击率 impulse_rate (m/s³)"
                      value={fsbImpulseRateValue}
                      onChange={setFsbImpulseRateValue}
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
                      onChange={setV0Value}
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
                          onChange={(nextValue) => updateSpeedCheck(index, nextValue)}
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
                      onClick={() => onChangeEmergencyRequirementMode("a_mean")}
                    />
                    <TogglePill
                      label="按制动距离录入"
                      active={emergencyRequirementMode === "distance"}
                      onClick={() => onChangeEmergencyRequirementMode("distance")}
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
                      onChange={emergencyRequirementMode === "a_mean" ? setEbMeanValue : setEbDistanceValue}
                      onBlur={() => markTouched("ebModeValue")}
                      placeholder={emergencyRequirementMode === "a_mean" ? "例如 1.10" : "例如 320"}
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("ebModeValue") ? fieldErrors.ebModeValue : undefined}
                    />
                    <FieldBlock
                      label="空走时间 t1 (s)"
                      value={ebT1Value}
                      onChange={setEbT1Value}
                      onBlur={() => markTouched("ebT1")}
                      placeholder="例如 0.40"
                      inputMode="decimal"
                      error={shouldShowFieldFeedback("ebT1") ? fieldErrors.ebT1 : undefined}
                    />
                    <FieldBlock
                      label="紧急制动响应时间 t2 (s)"
                      value={ebT2Value}
                      onChange={setEbT2Value}
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
                  当前 BCU 类型：{controllerConfigType === "car" ? "车控" : "架控"}。这里仅调整实例名称和动/拖类型；控制器数量来自初始化编组，调整后需要核对总数。
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
                    title="目标编组"
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
                    emphasizeCounts={controllerConfigType === "bogie" && hasMixedBogieVehicles}
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
                  {controllerConfigType === "car"
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
                  <FieldBlock label={`AW0 / ${loadInputMode === "car" ? "动车称重（整车）" : "动架称重"}`} />
                  <FieldBlock label={`AW0 / ${loadInputMode === "car" ? "拖车称重（整车）" : "拖架称重"}`} />
                  <FieldBlock label={`AW3 / ${loadInputMode === "car" ? "动车称重（整车）" : "动架称重"}`} />
                  <FieldBlock label={`AW3 / ${loadInputMode === "car" ? "拖车称重（整车）" : "拖架称重"}`} />
                </div>
              </section>

              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>转向架参数录入</h3>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  `bogie_weight` 始终按单个转向架口径录入，本区同时承担车辆称重口径和架称重口径的关系说明。
                </p>
                <div style={{ display: "grid", gap: "12px" }}>
                  <FieldBlock label="动车转向架重量 bogie_weight (ton)" />
                  <FieldBlock label="拖车转向架重量 bogie_weight (ton)" />
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
                    <PointRow unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"} index={1} />
                    <PointRow unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"} index={2} />
                    <PointRow unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"} index={3} />
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
                      <FieldBlock label="空簧线性系数 k (kPa/ton)" />
                      <FieldBlock label="空簧截距 b (kPa)" />
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
                    <FieldBlock label="活塞有效面积 Sc (m²)" />
                    <FieldBlock label="摩擦系数 xi (-)" />
                    <FieldBlock label="单元内部倍率 Li (-)" />
                    <FieldBlock label="单元内部效率 eta_i (-)" />
                    <FieldBlock label="外部倍率 Lo (-)" />
                    <FieldBlock label="外部效率 eta_o (-)" />
                    <FieldBlock label="单元复位力 Fs1 (kN)" />
                    <FieldBlock label="单元复位力 Fs2 (kN)" />
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
                      <FieldBlock label="轮径 Dw (m)" />
                      <FieldBlock label="摩擦半径 Rf (m)" />
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", marginBottom: "16px" }}>
                <InfoCard title="当前状态：未补充停放校核" body="当前版本尚未录入线路坡度和停放参数，运行结果中仅保留待补录状态。" />
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
                    <FieldBlock label="要求安全系数 required_safety_margin (-)" />
                    <FieldBlock label="静摩擦系数 xi0 / static_friction_coefficient (-)" />
                    <FieldBlock label="每车停放缸数量 n_parking_cylinders_by_car (-)" />
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
                    <FieldBlock label="最大风速 wind_speed_max (m/s)" />
                    <FieldBlock label="风阻系数 wind_resistance_coefficient (-)" />
                    <FieldBlock label="AW0 坡度 grade_by_load_group.AW0 (‰)" />
                    <FieldBlock label="AW2 坡度 grade_by_load_group.AW2 (‰)" />
                    <FieldBlock label="AW3 坡度 grade_by_load_group.AW3 (‰)" />
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
                    <FieldBlock label="停放弹簧输出力 Fp (kN)" />
                    <FieldBlock label="单元复位力 Fs1 (kN)" />
                    <FieldBlock label="单元复位力 Fs2 (kN)" />
                    <FieldBlock label="停放缸内部倍率 Lpi (-)" />
                    <FieldBlock label="停放缸内部效率 eta_pi (-)" />
                    <FieldBlock label="执行机构外部倍率 Lo (-)" />
                    <FieldBlock label="执行机构外部效率 eta_o (-)" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "calibration" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>标定</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                本章按载重工况组织，而不是先按制动模式组织。先判断每组工况当前是否完整，再进入对应试验点表。
              </p>
              <div style={{ display: "grid", gap: "16px" }}>
                <CalibrationCaseCard
                  title="AW3-AW0 工况"
                  status="当前状态：已完成 aw3_aw0 首轮标定"
                  summary="已完成首轮常用制动与紧急制动标定，可继续替换试验点并重新运行。"
                />
                <CalibrationCaseCard
                  title="AW3-AW2 工况"
                  status="当前状态：待补充 aw3_aw2 标定"
                  summary="当前尚未补 aw3_aw2 试验点，待第二轮试验数据返回后补录。"
                />
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
          <ActiveInfoTabs />
          <div style={{ display: "grid", gap: "12px" }}>
            <InfoCard title="当前章节说明" body="优先确认车辆称重和转向架参数的口径关系，再继续空簧特性输入。" />
            <InfoCard title="待确认项" body="1. 录入口径切换；2. ton / kN 辅助换算；3. 基础机械参数错误回填。" />
          </div>
        </aside>
      </div>
    </div>
  );
}
