import type { ReactElement } from "react";

import { panelStyle, primaryActionStyle, secondaryActionStyle } from "../app/styles";
import { FieldBlock, StepPill } from "../components/ui";

function parseNonNegativeInteger(value: string): number | undefined {
  const trimmedValue = value.trim();
  if (!/^(0|[1-9]\d*)$/.test(trimmedValue)) {
    return undefined;
  }
  return Number(trimmedValue);
}

export function WizardPage({
  bcuType,
  hasMixedBogieVehicles,
  mixedCars,
  showResetHint,
  totalCars,
  poweredCars,
  trailerCars,
  projectName,
  projectCode,
  projectEmail,
  projectNote,
  onChangeBcuType,
  onChangeHasMixedBogieVehicles,
  onChangeTotalCars,
  onChangeMixedCars,
  onChangePoweredCars,
  onChangeTrailerCars,
  onChangeProjectName,
  onChangeProjectCode,
  onChangeProjectEmail,
  onChangeProjectNote,
  onEnterWorkbench
}: {
  bcuType: "car" | "bogie";
  hasMixedBogieVehicles: boolean;
  mixedCars: string;
  showResetHint: boolean;
  totalCars: string;
  poweredCars: string;
  trailerCars: string;
  projectName: string;
  projectCode: string;
  projectEmail: string;
  projectNote: string;
  onChangeBcuType: (type: "car" | "bogie") => void;
  onChangeHasMixedBogieVehicles: (checked: boolean) => void;
  onChangeTotalCars: (value: string) => void;
  onChangeMixedCars: (value: string) => void;
  onChangePoweredCars: (value: string) => void;
  onChangeTrailerCars: (value: string) => void;
  onChangeProjectName: (value: string) => void;
  onChangeProjectCode: (value: string) => void;
  onChangeProjectEmail: (value: string) => void;
  onChangeProjectNote: (value: string) => void;
  onEnterWorkbench: () => void;
}): ReactElement {
  const mixedCarsValue = parseNonNegativeInteger(mixedCars);
  const totalCarsValue = parseNonNegativeInteger(totalCars);
  const poweredCarsValue = parseNonNegativeInteger(poweredCars);
  const trailerCarsValue = parseNonNegativeInteger(trailerCars);
  const totalCarsError =
    totalCarsValue === undefined
      ? "请输入正整数"
      : totalCarsValue <= 0
        ? "总车数必须大于 0"
        : undefined;
  const poweredCarsError = poweredCarsValue === undefined ? "请输入非负整数" : undefined;
  const trailerCarsError = trailerCarsValue === undefined ? "请输入非负整数" : undefined;
  const mixedCarsError =
    hasMixedBogieVehicles && mixedCarsValue === undefined ? "请输入非负整数" : undefined;
  const sumError =
    totalCarsError === undefined &&
    poweredCarsError === undefined &&
    trailerCarsError === undefined &&
    mixedCarsError === undefined &&
    poweredCarsValue !== undefined &&
    trailerCarsValue !== undefined &&
    totalCarsValue !== undefined &&
    (hasMixedBogieVehicles ? mixedCarsValue !== undefined : true) &&
    (hasMixedBogieVehicles
      ? poweredCarsValue + trailerCarsValue + (mixedCarsValue ?? 0) !== totalCarsValue
      : poweredCarsValue + trailerCarsValue !== totalCarsValue)
      ? hasMixedBogieVehicles
        ? "混合车数量、拖车数量与动车数量之和必须等于总车数"
        : "动车数量与拖车数量之和必须等于总车数"
      : undefined;
  const canGenerate =
    totalCarsError === undefined &&
    poweredCarsError === undefined &&
    trailerCarsError === undefined &&
    mixedCarsError === undefined &&
    sumError === undefined;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0, fontSize: "32px" }}>新建设计项目</h2>
        <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
          两步初始化向导用于先确定项目基础信息和初始化配置。
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <StepPill label="1. 项目基础信息" />
          <StepPill label="2. 初始化配置" active />
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px"
        }}
      >
        <div
          style={{
            ...panelStyle,
            display: "grid",
            gap: "12px"
          }}
        >
          <h3 style={{ margin: 0 }}>步骤 1 · 项目基础信息</h3>
          <FieldBlock label="项目名称" value={projectName} onChange={onChangeProjectName} />
          <FieldBlock label="项目编号" value={projectCode} onChange={onChangeProjectCode} />
          <FieldBlock label="报告获取邮箱" value={projectEmail} onChange={onChangeProjectEmail} />
          <FieldBlock label="备注（非必填）" value={projectNote} onChange={onChangeProjectNote} />
        </div>

        <div
          style={{
            ...panelStyle,
            display: "grid",
            gap: "12px"
          }}
        >
          <h3 style={{ margin: 0 }}>步骤 2 · 初始化配置</h3>
          <div>
            <strong style={{ fontSize: "14px" }}>BCU 类型</strong>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                style={bcuType === "bogie" ? primaryActionStyle : secondaryActionStyle}
                onClick={() => onChangeBcuType("bogie")}
              >
                架控
              </button>
              <button
                type="button"
                style={bcuType === "car" ? primaryActionStyle : secondaryActionStyle}
                onClick={() => onChangeBcuType("car")}
              >
                车控
              </button>
            </div>
          </div>
          {bcuType === "bogie" ? (
            <label
              style={{
                display: "grid",
                gap: "8px",
                color: "#1f1b16"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
                <input
                  aria-label="存在动/拖架混合车辆"
                  checked={hasMixedBogieVehicles}
                  type="checkbox"
                  onChange={(event) => onChangeHasMixedBogieVehicles(event.target.checked)}
                />
                存在动/拖架混合车辆
              </span>
              {showResetHint ? (
                <span style={{ color: "#c64532", fontSize: "13px", lineHeight: 1.5 }}>
                  已切换编组模式，请重新填写车辆数量。
                </span>
              ) : null}
            </label>
          ) : null}
          <FieldBlock
            label="总车数"
            value={totalCars}
            onChange={onChangeTotalCars}
            inputMode="numeric"
            error={totalCarsError}
          />
          {hasMixedBogieVehicles && bcuType === "bogie" ? (
            <>
              <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>
                请按车辆口径填写混合车、拖车、动车数量。
              </p>
              <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>
                混合车按 1 辆拖车计入拖车数量；生成实例后，将默认把首辆拖车生成为 1 个拖架 + 1 个动架。
              </p>
              <FieldBlock
                label="混合车数量"
                value={mixedCars}
                onChange={onChangeMixedCars}
                inputMode="numeric"
                error={mixedCarsError}
              />
            </>
          ) : null}
          <FieldBlock
            label="动车数量"
            value={poweredCars}
            onChange={onChangePoweredCars}
            inputMode="numeric"
            error={poweredCarsError}
          />
          <FieldBlock
            label="拖车数量"
            value={trailerCars}
            onChange={onChangeTrailerCars}
            inputMode="numeric"
            error={trailerCarsError}
          />
          <div
            style={{
              border: sumError ? "1px solid #c64532" : "1px dashed #c8b9a7",
              borderRadius: "16px",
              background: sumError ? "#fff1ee" : "#f8f2eb",
              padding: "16px",
              color: sumError ? "#c64532" : "#6b6259"
            }}
          >
            {sumError ?? "生成摘要：将基于 BCU 类型和编组信息生成初始配置骨架，并在下一步进入工作台。"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
            <button
              type="button"
              style={{
                ...primaryActionStyle,
                opacity: canGenerate ? 1 : 0.55,
                cursor: canGenerate ? "pointer" : "not-allowed"
              }}
              disabled={!canGenerate}
              onClick={onEnterWorkbench}
            >
              生成配置并进入工作台
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
