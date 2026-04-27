import type { ReactElement } from "react";

import {
  ghostActionStyle,
  panelStyle,
  primaryActionStyle,
  secondaryActionStyle
} from "../app/styles";
import { FieldBlock, ProjectRow } from "../components/ui";

export function HomePage({
  onCreateProject,
  onOpenProject
}: {
  onCreateProject: () => void;
  onOpenProject: () => void;
}): ReactElement {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr",
          gap: "16px"
        }}
      >
        <div
          style={{
            border: "1px solid #d5c9ba",
            borderRadius: "18px",
            padding: "20px",
            background: "#fff"
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "32px" }}>开始你的制动计算</h2>
          <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
            首页同时承接新建项目计算和打开既有项目两条主路径。
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" style={primaryActionStyle} onClick={onCreateProject}>
              新建项目计算
            </button>
            <button type="button" style={secondaryActionStyle}>
              打开既有项目
            </button>
          </div>
        </div>
        <div
          style={{
            border: "1px solid #d5c9ba",
            borderRadius: "18px",
            padding: "20px",
            background: "#fff",
            display: "grid",
            gap: "14px",
            alignContent: "start"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>列表筛选</strong>
            <button type="button" style={ghostActionStyle}>
              导入 YAML
            </button>
          </div>
          <FieldBlock label="项目名称 / 编号搜索" />
          <FieldBlock label="BCU 类型筛选" />
        </div>
      </section>

      <section
        style={{
          ...panelStyle,
          display: "grid",
          gap: "12px"
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 8px" }}>既有项目</h3>
          <p style={{ margin: 0, color: "#6b6259" }}>
            默认按最后修改时间倒序；列表内显示项目身份、BCU 类型和最近运行状态。
          </p>
        </div>
        <ProjectRow
          title="上海机场线制动项目 / SH-HX-026"
          subtitle="适用于既有项目打开与重算"
          updatedAt="最后修改时间"
          controllerMode="架控"
          status="最近运行成功"
          onOpen={onOpenProject}
        />
        <ProjectRow
          title="崇明线预研项目 / CM-PR-011"
          subtitle="等待补充停放校核"
          updatedAt="最后修改时间"
          controllerMode="车控"
          status="最近运行失败"
          onOpen={onOpenProject}
        />
      </section>
    </div>
  );
}
