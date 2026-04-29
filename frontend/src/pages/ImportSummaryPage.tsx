import type { ReactElement } from "react";

import { panelStyle, primaryActionStyle, secondaryActionStyle } from "../app/styles";
import { InfoCard } from "../components/ui";

export function ImportSummaryPage({
  onEnterWorkbench,
  onViewOverview,
  projectName,
  projectCode,
  onChangeProjectName,
  onChangeProjectCode,
  yamlText,
  onChangeYamlText,
}: {
  onEnterWorkbench: () => void;
  onViewOverview: () => void;
  projectName: string;
  projectCode: string;
  onChangeProjectName: (value: string) => void;
  onChangeProjectCode: (value: string) => void;
  yamlText: string;
  onChangeYamlText: (value: string) => void;
}): ReactElement {
  const canEnterWorkbench =
    projectName.trim().length > 0 && projectCode.trim().length > 0 && yamlText.trim().length > 0;

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "32px" }}>导入摘要</h2>
            <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
              导入成功后先确认配置是否完整、是否存在警告，再决定进入工作台还是查看总览。
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              style={primaryActionStyle}
              onClick={onEnterWorkbench}
              disabled={!canEnterWorkbench}
            >
              进入工作台
            </button>
            <button type="button" style={secondaryActionStyle} onClick={onViewOverview}>
              查看总览
            </button>
          </div>
        </div>
      </section>
      <section style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>项目元数据补录</h3>
        <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
          导入 YAML 不包含项目元数据，请先补全后再保存为配置版本。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" }}>
          <label style={{ display: "grid", gap: "6px", fontSize: "14px" }}>
            项目名称
            <input
              aria-label="项目名称"
              value={projectName}
              onChange={(event) => onChangeProjectName(event.target.value)}
              style={{ border: "1px solid #d5c9ba", borderRadius: "10px", padding: "8px 10px" }}
            />
          </label>
          <label style={{ display: "grid", gap: "6px", fontSize: "14px" }}>
            项目编号
            <input
              aria-label="项目编号"
              value={projectCode}
              onChange={(event) => onChangeProjectCode(event.target.value)}
              style={{ border: "1px solid #d5c9ba", borderRadius: "10px", padding: "8px 10px" }}
            />
          </label>
        </div>
        <label style={{ display: "grid", gap: "6px", fontSize: "14px", marginTop: "12px" }}>
          导入 YAML 文本
          <textarea
            aria-label="导入 YAML 文本"
            value={yamlText}
            onChange={(event) => onChangeYamlText(event.target.value)}
            rows={8}
            style={{
              border: "1px solid #d5c9ba",
              borderRadius: "10px",
              padding: "10px",
              fontFamily: "Consolas, monospace",
            }}
          />
        </label>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        <InfoCard
          title="是否包含停放校核 / 标定 / electric_brake 等后置内容"
          body="当前已识别到：包含标定、未包含停放校核、包含 electric_brake 特性输入。"
        />
        <InfoCard title="是否存在导入警告" body="存在 1 条导入警告：AW2 质量参数缺失，将按 V1 fallback 规则处理。" />
        <InfoCard title="是否可直接运行" body="当前可直接运行主制动计算，但建议先补停放校核再完成整体验收。" />
      </section>
    </div>
  );
}
