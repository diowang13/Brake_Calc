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

export function SupplementCard({ title, body }: { title: string; body: string }): ReactElement {
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
        <button type="button" style={secondaryActionStyle}>
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
  inputMode = "text"
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
              background: "#fff",
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
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                padding: "10px 12px",
                fontSize: "14px"
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

export function PointRow({ index, unitLabel }: { index: number; unitLabel: string }): ReactElement {
  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "16px",
        padding: "16px",
        background: "#fff"
      }}
    >
      <h4 style={{ margin: "0 0 12px" }}>{`特征点 ${index}`}</h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <FieldBlock label="压力 (kPa)" />
        <FieldBlock label={unitLabel} />
      </div>
    </div>
  );
}

export function CalibrationCaseCard({
  title,
  status,
  summary
}: {
  title: string;
  status: string;
  summary: string;
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div
          style={{
            border: "1px solid #d5c9ba",
            borderRadius: "14px",
            padding: "14px",
            background: "#fffaf4"
          }}
        >
          <h5 style={{ margin: "0 0 10px" }}>常用制动试验点表</h5>
          <div style={{ display: "grid", gap: "10px" }}>
            <FieldBlock label="试验点 1：压力 / 载荷" />
            <FieldBlock label="试验点 2：压力 / 载荷" />
          </div>
        </div>
        <div
          style={{
            border: "1px solid #d5c9ba",
            borderRadius: "14px",
            padding: "14px",
            background: "#fffaf4"
          }}
        >
          <h5 style={{ margin: "0 0 10px" }}>紧急制动试验点表</h5>
          <div style={{ display: "grid", gap: "10px" }}>
            <FieldBlock label="试验点 1：压力 / 载荷" />
            <FieldBlock label="试验点 2：压力 / 载荷" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TogglePill({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={active ? primaryActionStyle : secondaryActionStyle}
    >
      {label}
    </button>
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

export function ActiveInfoTabs(): ReactElement {
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
      <span style={activeTabStyle}>说明</span>
      <span style={inactiveTabStyle}>错误</span>
      <span style={inactiveTabStyle}>YAML</span>
    </div>
  );
}
