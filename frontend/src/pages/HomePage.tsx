import type { ChangeEvent, ReactElement } from "react";

import {
  ghostActionStyle,
  panelStyle,
  primaryActionStyle,
  secondaryActionStyle
} from "../app/styles";
import { FieldBlock, ProjectRow } from "../components/ui";
import type { ProjectListItem } from "../contracts/config";

export function HomePage({
  onCreateProject,
  onOpenProject,
  onOpenProjectSelector,
  onImportYamlFile,
  projects
}: {
  onCreateProject: () => void;
  onOpenProject: (projectCode: string) => void;
  onOpenProjectSelector: () => void;
  onImportYamlFile: (yamlText: string) => void;
  projects: ProjectListItem[];
}): ReactElement {
  const formatUpdatedAt = (value: string): string => {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      return value;
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hour = String(parsed.getHours()).padStart(2, "0");
    const minute = String(parsed.getMinutes()).padStart(2, "0");
    const second = String(parsed.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };
  const handleImportYamlFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      onImportYamlFile(content);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const rows =
    projects.length > 0
      ? projects
      : [
          {
            project_name: "上海机场线制动项目",
            project_code: "SH-HX-026",
            updated_at: "最后修改时间",
            latest_input_config_id: null,
            latest_run: { calculation_run_id: "", status: "succeeded", report: null, created_at: "" },
          },
          {
            project_name: "崇明线预研项目",
            project_code: "CM-PR-011",
            updated_at: "最后修改时间",
            latest_input_config_id: null,
            latest_run: { calculation_run_id: "", status: "failed", report: null, created_at: "" },
          },
        ];
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
            <button
              type="button"
              style={secondaryActionStyle}
              onClick={onOpenProjectSelector}
              disabled={projects.length === 0}
              title={projects.length === 0 ? "当前无可打开项目" : undefined}
            >
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
            <label style={{ ...ghostActionStyle, cursor: "pointer", display: "inline-block" }}>
              上传 YAML
              <input
                type="file"
                accept=".yaml,.yml,text/yaml,text/x-yaml"
                aria-label="上传 YAML 文件"
                onChange={handleImportYamlFile}
                style={{ display: "none" }}
              />
            </label>
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
        {rows.map((item) => (
          <ProjectRow
            key={item.project_code}
            title={`${item.project_name} / ${item.project_code}`}
            subtitle="适用于既有项目打开与重算"
            updatedAt={formatUpdatedAt(item.updated_at)}
            controllerMode={
              item.controller_type === "bogie"
                ? "架控"
                : item.controller_type === "car"
                  ? "车控"
                  : "未知"
            }
            status={
              item.latest_run?.status === "succeeded"
                ? "最近运行成功"
                : item.latest_run?.status === "failed"
                  ? "最近运行失败"
                  : "暂无运行记录"
            }
            onOpen={() => onOpenProject(item.project_code)}
          />
        ))}
      </section>
    </div>
  );
}
