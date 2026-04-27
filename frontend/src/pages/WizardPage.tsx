import type { ReactElement } from "react";

import { panelStyle, primaryActionStyle, secondaryActionStyle } from "../app/styles";
import { FieldBlock, StepPill } from "../components/ui";

export function WizardPage({ onEnterWorkbench }: { onEnterWorkbench: () => void }): ReactElement {
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
          <FieldBlock label="项目名称" />
          <FieldBlock label="项目编号" />
          <FieldBlock label="报告获取邮箱" />
          <FieldBlock label="备注（非必填）" />
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
              <button type="button" style={secondaryActionStyle}>
                架控
              </button>
              <button type="button" style={primaryActionStyle}>
                车控
              </button>
            </div>
          </div>
          <FieldBlock label="总车数" />
          <FieldBlock label="动车数" />
          <FieldBlock label="拖车数" />
          <div
            style={{
              border: "1px dashed #c8b9a7",
              borderRadius: "16px",
              background: "#f8f2eb",
              padding: "16px",
              color: "#6b6259"
            }}
          >
            生成摘要：将基于 BCU 类型和编组信息生成初始配置骨架，并在下一步进入工作台。
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
            <button type="button" style={primaryActionStyle} onClick={onEnterWorkbench}>
              生成配置并进入工作台
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
