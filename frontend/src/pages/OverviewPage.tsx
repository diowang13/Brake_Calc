import type { ReactElement } from "react";

import { ghostActionStyle, panelStyle, secondaryActionStyle } from "../app/styles";
import { InfoCard, NavSection, SupplementCard } from "../components/ui";

export function OverviewPage({ onViewResult }: { onViewResult: () => void }): ReactElement {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr 280px",
        gap: "18px"
      }}
    >
      <aside style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>章节导航</h3>
        <NavSection
          title="主配置"
          items={[
            { label: "运行基础配置 / 技术条件", status: "锁定" },
            { label: "车辆与控制器配置", status: "锁定" },
            { label: "载荷与空簧", status: "锁定" },
            { label: "基础制动机械参数", status: "锁定" }
          ]}
        />
        <NavSection
          title="后置补录"
          items={[
            { label: "停放校核", status: "未补充", active: true },
            { label: "标定", status: "已补充" },
            { label: "电空计算", status: "未补充" }
          ]}
        />
      </aside>

      <div style={{ display: "grid", gap: "18px" }}>
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "32px" }}>上海机场线制动项目 / SH-HX-026</h2>
              <p style={{ margin: "8px 0 0", color: "#6b6259" }}>版本 V3 · 已运行成功版本</p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
              <button type="button" style={secondaryActionStyle} onClick={onViewResult}>
                查看结果
              </button>
              <button type="button" style={ghostActionStyle}>
                修订
              </button>
            </div>
          </div>
          <div
            style={{
              marginTop: "16px",
              border: "1px solid #d9c8b5",
              borderRadius: "16px",
              background: "#fff6ee",
              padding: "16px"
            }}
          >
            <strong>当前为只读状态。</strong>
            <p style={{ margin: "8px 0 0", color: "#6b6259", lineHeight: 1.6 }}>
              当前版本已运行成功，不能直接修改主配置。若需修改主配置，请点击“修订”创建新版本副本。
            </p>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          <InfoCard title="最后一次运行" body="2026-04-26 09:40 · 运行成功" />
          <InfoCard title="警告与自动调整" body="存在 1 条自动调整：EB 使用等黏着分配。" />
          <InfoCard title="停放校核状态" body="当前版本未补充停放校核，待获取线路坡度后补录。" />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          <SupplementCard title="补充停放校核" body="状态：未补充" />
          <SupplementCard title="补充标定" body="状态：已补充" />
          <SupplementCard title="补充电空计算" body="状态：未补充" />
        </section>
      </div>

      <aside style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>版本信息</h3>
        <InfoCard title="当前版本" body="V3 · 架控口径" />
        <div style={{ height: "12px" }} />
        <InfoCard title="查看更多" body="可展开少量关键配置：BCU 类型、制动类型、是否包含快速制动。" />
      </aside>
    </div>
  );
}
