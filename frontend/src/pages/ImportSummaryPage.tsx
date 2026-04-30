import type { ReactElement } from "react";

import { panelStyle, primaryActionStyle, secondaryActionStyle } from "../app/styles";
import { InfoCard } from "../components/ui";
import type { SupplementPresence, ValidationErrorItem } from "../contracts/config";

export function ImportSummaryPage({
  onSaveAndViewOverview,
  onViewOverview,
  projectName,
  projectCode,
  onChangeProjectName,
  onChangeProjectCode,
  yamlText,
  onChangeYamlText,
  importValid,
  importErrors,
  supplementPresence,
  submitError,
  isSubmitting,
}: {
  onSaveAndViewOverview: () => void;
  onViewOverview: () => void;
  projectName: string;
  projectCode: string;
  onChangeProjectName: (value: string) => void;
  onChangeProjectCode: (value: string) => void;
  yamlText: string;
  onChangeYamlText: (value: string) => void;
  importValid: boolean | null;
  importErrors: ValidationErrorItem[];
  supplementPresence: SupplementPresence;
  submitError: string | null;
  isSubmitting: boolean;
}): ReactElement {
  const canEnterWorkbench =
    projectName.trim().length > 0 && projectCode.trim().length > 0 && yamlText.trim().length > 0;

  const supplementSummary = [
    `停放校核：${supplementPresence.hasParkingBrakeCheck ? "已包含" : "未包含"}`,
    `标定：${supplementPresence.hasPressureCalibration ? "已包含" : "未包含"}`,
    `electric_brake：${supplementPresence.hasElectricBrake ? "已包含" : "未包含"}`,
  ].join("，");
  const warningSummary =
    importErrors.length > 0
      ? `存在 ${importErrors.length} 条导入警告：${importErrors[0]?.message ?? ""}`
      : "无导入警告。";
  const runnableSummary =
    importValid === null
      ? "尚未执行导入校验。"
      : importValid
        ? "当前可直接运行主制动计算。"
        : "当前不可直接运行，请先修正导入错误。";

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
              onClick={onSaveAndViewOverview}
              disabled={!canEnterWorkbench || isSubmitting}
            >
              {isSubmitting ? "保存中..." : "保存并查看总览"}
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
        {submitError ? (
          <p style={{ margin: "10px 0 0", color: "#c64532", fontSize: "13px" }}>{submitError}</p>
        ) : null}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        <InfoCard
          title="是否包含停放校核 / 标定 / electric_brake 等后置内容"
          body={`当前已识别到：${supplementSummary}。`}
        />
        <InfoCard title="是否存在导入警告" body={warningSummary} />
        <InfoCard title="是否可直接运行" body={runnableSummary} />
      </section>
    </div>
  );
}
