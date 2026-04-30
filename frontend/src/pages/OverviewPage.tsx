import type { ReactElement } from "react";
import type { LoadConfigResult } from "../contracts/config";

import { ghostActionStyle, panelStyle, secondaryActionStyle } from "../app/styles";
import { InfoCard, NavSection, SupplementCard } from "../components/ui";

type OverviewData = Pick<
  LoadConfigResult,
  "project" | "version" | "source_input_config_id" | "revision_reason" | "form_state"
>;

export function OverviewPage({
  onViewResult,
  onRevise,
  onSupplementParking,
  onSupplementCalibration,
  overviewData,
}: {
  onViewResult: () => void;
  onRevise: () => void;
  onSupplementParking: () => void;
  onSupplementCalibration: () => void;
  overviewData: OverviewData | null;
}): ReactElement {
  const projectName = overviewData?.project.project_name ?? "上海机场线制动项目";
  const projectCode = overviewData?.project.project_code ?? "SH-HX-026";
  const version = overviewData?.version ?? 3;
  const revisionNote = overviewData?.revision_reason ?? "未记录";
  const sourceConfigId = overviewData?.source_input_config_id ?? "无";

  const formState = overviewData?.form_state ?? null;
  const parkingEnabled =
    typeof formState?.parking_brake_check === "object" &&
    formState?.parking_brake_check !== null &&
    typeof (formState.parking_brake_check as { enabled?: unknown }).enabled === "boolean" &&
    (formState.parking_brake_check as { enabled: boolean }).enabled;
  const calibrationEnabled =
    typeof formState?.pressure_calibration === "object" &&
    formState?.pressure_calibration !== null &&
    typeof (formState.pressure_calibration as { enabled?: unknown }).enabled === "boolean" &&
    (formState.pressure_calibration as { enabled: boolean }).enabled;
  const isImportedVersion = overviewData !== null;
  const hasRunRecord = !isImportedVersion;

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
            { label: "停放校核", status: parkingEnabled ? "已补充" : "未补充", active: true },
            { label: "标定", status: calibrationEnabled ? "已补充" : "未补充" }
          ]}
        />
      </aside>

      <div style={{ display: "grid", gap: "18px" }}>
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "32px" }}>{`${projectName} / ${projectCode}`}</h2>
              <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
                {isImportedVersion ? `版本 V${version} · 未运行` : `版本 V${version} · 已运行成功版本`}
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
              <button
                type="button"
                style={secondaryActionStyle}
                onClick={onViewResult}
                disabled={!hasRunRecord}
              >
                查看结果
              </button>
              <button type="button" style={ghostActionStyle} onClick={onRevise}>
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
              {isImportedVersion
                ? "当前版本来自导入配置，尚未运行。请先补录后置章节并运行，再查看结果。"
                : "当前版本已运行成功，不能直接修改主配置。若需修改主配置，请点击“修订”创建新版本副本。"}
            </p>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          <InfoCard
            title="最后一次运行"
            body={isImportedVersion ? "当前版本尚未运行。" : "2026-04-26 09:40 · 运行成功"}
          />
          <InfoCard
            title="警告与自动调整"
            body={isImportedVersion ? "暂无运行数据（需先运行）。" : "存在 1 条自动调整：EB 使用等黏着分配。"}
          />
          <InfoCard
            title="停放校核状态"
            body={
              isImportedVersion
                ? parkingEnabled
                  ? "当前版本已包含停放校核配置。"
                  : "当前版本未补充停放校核，待补录后运行验证。"
                : "当前版本未补充停放校核，待获取线路坡度后补录。"
            }
          />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          <SupplementCard
            title="补充停放校核"
            body={`状态：${parkingEnabled ? "已补充" : "未补充"}`}
            onClick={onSupplementParking}
          />
          <SupplementCard
            title="补充标定"
            body={`状态：${calibrationEnabled ? "已补充" : "未补充"}`}
            onClick={onSupplementCalibration}
          />
        </section>
      </div>

      <aside style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>版本信息</h3>
        <InfoCard title="当前版本" body={`V${version} · 架控口径`} />
        <div style={{ height: "12px" }} />
        <InfoCard title="来源配置" body={sourceConfigId} />
        <div style={{ height: "12px" }} />
        <InfoCard title="修订原因" body={revisionNote} />
      </aside>
    </div>
  );
}
