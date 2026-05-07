import type { ReactElement } from "react";

import {
  activeTabStyle,
  fieldLabelStyle,
  ghostActionStyle,
  inactiveTabStyle,
  primaryActionStyle,
  secondaryActionStyle
} from "../app/styles";

export function NavSection({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; status: string; active?: boolean; onSelect?: () => void }>;
}): ReactElement {
  return (
    <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
      <div
        style={{
          color: "#6b6259",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase"
        }}
      >
        {title}
      </div>
      {items.map((item) => (
        <button
          key={`${title}-${item.label}`}
          type="button"
          onClick={item.onSelect}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            border: item.active ? "1px solid #b8642d" : "1px solid #d5c9ba",
            background: item.active ? "#fff6ee" : title === "主配置" ? "#f5f0ea" : "#fff",
            opacity: title === "主配置" ? 0.65 : 1,
            borderRadius: "14px",
            padding: "12px 14px",
            cursor: item.onSelect ? "pointer" : "default",
            textAlign: "left"
          }}
        >
          <span>{item.label}</span>
          <span style={{ color: "#6b6259", fontSize: "12px" }}>{item.status}</span>
        </button>
      ))}
    </div>
  );
}

export function InfoCard({ title, body }: { title: string; body: string }): ReactElement {
  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "16px",
        padding: "16px",
        background: "#fff"
      }}
    >
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

export function SupplementCard({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick?: () => void;
}): ReactElement {
  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "16px",
        padding: "16px",
        background: "#fff",
        display: "grid",
        gap: "12px"
      }}
    >
      <div>
        <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
        <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>{body}</p>
      </div>
      <div>
        <button type="button" style={secondaryActionStyle} onClick={onClick}>
          点击补录
        </button>
      </div>
    </div>
  );
}

export function FieldBlock({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  hint,
  suffix,
  inputMode = "text",
  disabled = false
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  suffix?: string;
  inputMode?: "text" | "decimal" | "numeric";
  disabled?: boolean;
}): ReactElement {
  const isInteractive = typeof onChange === "function";

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <strong style={fieldLabelStyle}>{label}</strong>
      {isInteractive ? (
        <>
          <div
            style={{
              minHeight: "42px",
              borderRadius: "12px",
              border: error ? "1px solid #c64532" : "1px solid #ccbca8",
              background: disabled ? "#f2eee8" : "#fff",
              display: "flex",
              alignItems: "center",
              overflow: "hidden"
            }}
          >
            <input
              aria-label={label}
              type={inputMode === "text" ? "text" : "number"}
              value={value ?? ""}
              onChange={(event) => onChange(event.target.value)}
              onBlur={onBlur}
              placeholder={placeholder}
              inputMode={inputMode}
              disabled={disabled}
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                padding: "10px 12px",
                fontSize: "14px",
                color: disabled ? "#8a8178" : "#1f1b16"
              }}
            />
            {suffix ? (
              <span
                style={{
                  padding: "0 12px",
                  color: "#6b6259",
                  fontWeight: 700,
                  borderLeft: "1px solid #e5d7c7",
                  alignSelf: "stretch",
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#f8f2eb"
                }}
              >
                {suffix}
              </span>
            ) : null}
          </div>
          {error ? (
            <span style={{ color: "#c64532", fontSize: "12px" }}>{error}</span>
          ) : hint ? (
            <span style={{ color: "#6b6259", fontSize: "12px" }}>{hint}</span>
          ) : null}
        </>
      ) : (
        <div
          style={{
            height: "42px",
            borderRadius: "12px",
            border: "1px dashed #ccbca8",
            background: "#f8f2eb"
          }}
        />
      )}
    </div>
  );
}

export function SelectFieldBlock({
  label,
  value,
  options,
  onChange,
  disabled = false
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange?: (value: string) => void;
  disabled?: boolean;
}): ReactElement {
  const isInteractive = typeof onChange === "function";

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <strong style={fieldLabelStyle}>{label}</strong>
      {isInteractive ? (
        <div
          style={{
            minHeight: "42px",
            borderRadius: "12px",
            border: "1px solid #ccbca8",
            background: disabled ? "#f2eee8" : "#fff",
            display: "flex",
            alignItems: "center",
            overflow: "hidden"
          }}
        >
          <select
            aria-label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              padding: "10px 12px",
              fontSize: "14px"
            }}
          >
            {options.map((option) => (
              <option key={`${label}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div
          style={{
            height: "42px",
            borderRadius: "12px",
            border: "1px dashed #ccbca8",
            background: "#f8f2eb"
          }}
        />
      )}
    </div>
  );
}

export function PointRow({
  index,
  unitLabel,
  pressureValue,
  massValue,
  massHint,
  onChangePressure,
  onChangeMass,
  onDelete,
}: {
  index: number;
  unitLabel: string;
  pressureValue?: string;
  massValue?: string;
  massHint?: string;
  onChangePressure?: (value: string) => void;
  onChangeMass?: (value: string) => void;
  onDelete?: () => void;
}): ReactElement {
  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "16px",
        padding: "16px",
        background: "#fff"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h4 style={{ margin: 0 }}>{`特征点 ${index}`}</h4>
        {onDelete !== undefined ? (
          <button type="button" onClick={onDelete} style={{ border: "1px solid #ccbca8", borderRadius: "999px", background: "#fff", padding: "6px 10px", cursor: "pointer" }}>
            删除
          </button>
        ) : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <FieldBlock label="压力 (kPa)" value={pressureValue} onChange={onChangePressure} />
        <FieldBlock label={unitLabel} value={massValue} onChange={onChangeMass} />
      </div>
      {massHint ? (
        <p
          style={{
            margin: "8px 0 0",
            color: "#c64532",
            fontSize: "12px",
            lineHeight: 1.6,
            fontWeight: 700
          }}
        >
          {massHint}
        </p>
      ) : null}
    </div>
  );
}

export function CalibrationConfigCard({
  title,
  status,
  summary,
  mode,
  onChangeMode,
  pressureLabel,
  warning,
  showBrakeTypeSelect,
  firstPointLoadGroup,
  secondPointLoadGroup,
  firstPointBrakeType,
  secondPointBrakeType,
  onChangeFirstPointBrakeType,
  onChangeSecondPointBrakeType,
  pressureValue,
  onChangePressureValue,
  firstPointKValue,
  secondPointKValue,
  onChangeFirstPointKValue,
  onChangeSecondPointKValue,
  pressureAriaLabel,
  firstPointKAriaLabel,
  secondPointKAriaLabel
  ,
  pressureReferenceText,
  firstPointReferenceText,
  secondPointReferenceText,
  disabled = false
}: {
  title: string;
  status: string;
  summary: string;
  mode: "aw3_aw0" | "aw3_aw2";
  onChangeMode: (mode: "aw3_aw0" | "aw3_aw2") => void;
  pressureLabel: string;
  warning?: string;
  showBrakeTypeSelect: boolean;
  firstPointLoadGroup: "AW3";
  secondPointLoadGroup: "AW0" | "AW2";
  firstPointBrakeType: string;
  secondPointBrakeType: string;
  onChangeFirstPointBrakeType?: (value: string) => void;
  onChangeSecondPointBrakeType?: (value: string) => void;
  pressureValue: string;
  onChangePressureValue: (value: string) => void;
  firstPointKValue: string;
  secondPointKValue: string;
  onChangeFirstPointKValue: (value: string) => void;
  onChangeSecondPointKValue: (value: string) => void;
  pressureAriaLabel: string;
  firstPointKAriaLabel: string;
  secondPointKAriaLabel: string;
  pressureReferenceText?: string;
  firstPointReferenceText?: string;
  secondPointReferenceText?: string;
  disabled?: boolean;
}): ReactElement {
  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "16px",
        padding: "16px",
        background: "#fff",
        display: "grid",
        gap: "14px"
      }}
    >
      <div>
        <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
        <strong style={{ display: "block", marginBottom: "8px" }}>{status}</strong>
        <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>{summary}</p>
      </div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <TogglePill
          label="AW3-AW0 模式"
          active={mode === "aw3_aw0"}
          onClick={() => onChangeMode("aw3_aw0")}
          disabled={disabled}
        />
        <TogglePill
          label="AW3-AW2 模式"
          active={mode === "aw3_aw2"}
          onClick={() => onChangeMode("aw3_aw2")}
          disabled={disabled}
        />
      </div>
      <div
        style={{
          border: "1px solid #d5c9ba",
          borderRadius: "14px",
          padding: "14px",
          background: "#fffaf4"
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <FieldBlock
            label={pressureAriaLabel}
            value={pressureValue}
            onChange={onChangePressureValue}
            inputMode="decimal"
            disabled={disabled}
          />
          <InfoCard
            title="理论参考值"
            body={pressureReferenceText ?? "待接入基础机械模型计算结果后，在此显示理论参考值。"}
          />
        </div>
        {warning ? (
          <div
            style={{
              border: "1px solid #e0c4aa",
              borderRadius: "14px",
              padding: "14px",
              marginBottom: "12px",
              background: "#fff6ee",
              color: "#6b6259",
              lineHeight: 1.6
            }}
          >
            {warning}
          </div>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div
            style={{
              border: "1px solid #d5c9ba",
              borderRadius: "14px",
              padding: "14px",
              background: "#fff"
            }}
          >
            <h5 style={{ margin: "0 0 10px" }}>{`试验点 1（${firstPointLoadGroup}）`}</h5>
            <div style={{ display: "grid", gap: "10px" }}>
              {showBrakeTypeSelect ? (
                <SelectFieldBlock
                  label="制动类型"
                  value={firstPointBrakeType}
                  options={[
                    { label: "常用", value: "FSB" },
                    { label: "快速", value: "FB" }
                  ]}
                  onChange={onChangeFirstPointBrakeType}
                  disabled={disabled}
                />
              ) : (
                <InfoCard title="制动类型固定为 EB" body="紧急控制系数标定的试验点不提供 brake_type 切换。" />
              )}
              <FieldBlock
                label={firstPointKAriaLabel}
                value={firstPointKValue}
                onChange={onChangeFirstPointKValue}
                inputMode="decimal"
                disabled={disabled}
              />
              <InfoCard
                title="理论参考值"
                body={firstPointReferenceText ?? "待接入基础机械模型计算结果后，在此显示理论参考值。"}
              />
            </div>
          </div>
          <div
            style={{
              border: "1px solid #d5c9ba",
              borderRadius: "14px",
              padding: "14px",
              background: "#fff"
            }}
          >
            <h5 style={{ margin: "0 0 10px" }}>{`试验点 2（${secondPointLoadGroup}）`}</h5>
            <div style={{ display: "grid", gap: "10px" }}>
              {showBrakeTypeSelect ? (
                <SelectFieldBlock
                  label="制动类型"
                  value={secondPointBrakeType}
                  options={[
                    { label: "常用", value: "FSB" },
                    { label: "快速", value: "FB" }
                  ]}
                  onChange={onChangeSecondPointBrakeType}
                  disabled={disabled}
                />
              ) : (
                <InfoCard title="制动类型固定为 EB" body="紧急控制系数标定的试验点不提供 brake_type 切换。" />
              )}
              <FieldBlock
                label={secondPointKAriaLabel}
                value={secondPointKValue}
                onChange={onChangeSecondPointKValue}
                inputMode="decimal"
                disabled={disabled}
              />
              <InfoCard
                title="理论参考值"
                body={secondPointReferenceText ?? "待接入基础机械模型计算结果后，在此显示理论参考值。"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TogglePill({
  label,
  active,
  onClick,
  disabled = false
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      style={
        disabled
          ? { ...secondaryActionStyle, opacity: 0.55, cursor: "not-allowed" }
          : active
            ? primaryActionStyle
            : secondaryActionStyle
      }
    >
      {label}
    </button>
  );
}

export function CheckboxToggle({
  label,
  checked,
  onChange,
  disabled = false
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#8a8178" : "#1f1b16",
        fontWeight: 700
      }}
    >
      <input
        aria-label={label}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        style={{ width: "16px", height: "16px" }}
      />
      {label}
    </label>
  );
}

export function StepPill({ label, active = false }: { label: string; active?: boolean }): ReactElement {
  return (
    <span
      style={{
        borderRadius: "999px",
        padding: "10px 14px",
        border: active ? "1px solid #b8642d" : "1px solid #d5c9ba",
        background: active ? "#f1d8c6" : "#f8f2eb",
        color: active ? "#8d4c22" : "#6b6259"
      }}
    >
      {label}
    </span>
  );
}

export function ProjectRow({
  title,
  subtitle,
  updatedAt,
  controllerMode,
  status,
  onOpen
}: {
  title: string;
  subtitle: string;
  updatedAt: string;
  controllerMode: string;
  status: string;
  onOpen?: () => void;
}): ReactElement {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.8fr 1fr 0.8fr 1fr auto",
        gap: "12px",
        alignItems: "center",
        border: "1px solid #d5c9ba",
        borderRadius: "16px",
        padding: "16px",
        background: "#fff"
      }}
    >
      <div>
        <strong>{title}</strong>
        <div style={{ color: "#6b6259", marginTop: "6px", fontSize: "14px" }}>{subtitle}</div>
      </div>
      <div>{updatedAt}</div>
      <div>{controllerMode}</div>
      <div>{status}</div>
      <button type="button" style={ghostActionStyle} onClick={onOpen}>
        打开
      </button>
    </div>
  );
}

export function ActiveInfoTabs({
  activeTab,
  onChangeTab,
}: {
  activeTab: "description" | "errors" | "yaml";
  onChangeTab: (tab: "description" | "errors" | "yaml") => void;
}): ReactElement {
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
      <button
        type="button"
        style={activeTab === "description" ? activeTabStyle : inactiveTabStyle}
        onClick={() => onChangeTab("description")}
      >
        说明
      </button>
      <button
        type="button"
        style={activeTab === "errors" ? activeTabStyle : inactiveTabStyle}
        onClick={() => onChangeTab("errors")}
      >
        错误
      </button>
      <button
        type="button"
        style={activeTab === "yaml" ? activeTabStyle : inactiveTabStyle}
        onClick={() => onChangeTab("yaml")}
      >
        YAML
      </button>
    </div>
  );
}
