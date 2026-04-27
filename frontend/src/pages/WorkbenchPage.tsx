import type { ReactElement } from "react";

import {
  ghostActionStyle,
  panelStyle,
  primaryActionStyle,
  secondaryActionStyle
} from "../app/styles";
import {
  ActiveInfoTabs,
  CalibrationCaseCard,
  FieldBlock,
  InfoCard,
  NavSection,
  PointRow,
  TogglePill
} from "../components/ui";

export type WorkbenchSectionKey =
  | "load-air-spring"
  | "base-brake"
  | "parking"
  | "calibration"
  | "electric";

export function WorkbenchPage({
  loadInputMode,
  airSpringMassUnit,
  airSpringInputMode,
  activeSection,
  onChangeLoadInputMode,
  onChangeAirSpringMassUnit,
  onChangeAirSpringInputMode,
  onChangeSection,
  onBackToOverview
}: {
  loadInputMode: "car" | "bogie";
  airSpringMassUnit: "ton" | "kn";
  airSpringInputMode: "fitted_from_points" | "explicit_linear";
  activeSection: WorkbenchSectionKey;
  onChangeLoadInputMode: (mode: "car" | "bogie") => void;
  onChangeAirSpringMassUnit: (unit: "ton" | "kn") => void;
  onChangeAirSpringInputMode: (mode: "fitted_from_points" | "explicit_linear") => void;
  onChangeSection: (section: WorkbenchSectionKey) => void;
  onBackToOverview: () => void;
}): ReactElement {
  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "32px" }}>配置工作台</h2>
            <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
              当前聚焦主配置章节 `载荷与空簧`，先搭三栏外壳，再逐步接入正式表单。
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" style={ghostActionStyle} onClick={onBackToOverview}>
              返回总览
            </button>
            <button type="button" style={ghostActionStyle}>
              下载 YAML
            </button>
            <button type="button" style={secondaryActionStyle}>
              保存
            </button>
            <button type="button" style={primaryActionStyle}>
              运行
            </button>
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 300px",
          gap: "18px"
        }}
      >
        <aside style={panelStyle}>
          <NavSection
            title="主配置"
            items={[
              { label: "运行基础配置 / 技术条件", status: "已完成" },
              { label: "车辆与控制器配置", status: "已完成" },
              {
                label: "载荷与空簧",
                status: "2 项待确认",
                active: activeSection === "load-air-spring",
                onSelect: () => onChangeSection("load-air-spring")
              },
              {
                label: "基础制动机械参数",
                status: "1 项错误",
                active: activeSection === "base-brake",
                onSelect: () => onChangeSection("base-brake")
              }
            ]}
          />
          <NavSection
            title="后置补录"
            items={[
              {
                label: "停放校核",
                status: "未开始",
                active: activeSection === "parking",
                onSelect: () => onChangeSection("parking")
              },
              {
                label: "标定",
                status: "未开始",
                active: activeSection === "calibration",
                onSelect: () => onChangeSection("calibration")
              },
              {
                label: "电空计算",
                status: "未开始",
                active: activeSection === "electric",
                onSelect: () => onChangeSection("electric")
              }
            ]}
          />
        </aside>

        <div style={{ display: "grid", gap: "18px" }}>
          {activeSection === "load-air-spring" && (
            <>
              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>载荷与空簧</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
                  <InfoCard title="本章状态" body="当前已完成大部分质量参数录入，仍需确认口径切换和空簧单位。" />
                  <InfoCard title="本章说明" body="这一页用于组织车辆载荷、转向架参数与空簧特性，是最主要的防错区。" />
                </div>
              </section>

              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>车辆载荷参数录入</h3>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  根据当前录入口径，字段名称会同步切换，避免把整车称重和架称重混在一起。
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <TogglePill
                    label="按整车录入（推荐）"
                    active={loadInputMode === "car"}
                    onClick={() => onChangeLoadInputMode("car")}
                  />
                  <TogglePill
                    label="按转向架录入"
                    active={loadInputMode === "bogie"}
                    onClick={() => onChangeLoadInputMode("bogie")}
                  />
                </div>
                <div style={{ display: "grid", gap: "12px" }}>
                  <FieldBlock label={`AW0 / ${loadInputMode === "car" ? "动车称重（整车）" : "动架称重"}`} />
                  <FieldBlock label={`AW0 / ${loadInputMode === "car" ? "拖车称重（整车）" : "拖架称重"}`} />
                  <FieldBlock label={`AW3 / ${loadInputMode === "car" ? "动车称重（整车）" : "动架称重"}`} />
                  <FieldBlock label={`AW3 / ${loadInputMode === "car" ? "拖车称重（整车）" : "拖架称重"}`} />
                </div>
              </section>

              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>转向架参数录入</h3>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  `bogie_weight` 始终按单个转向架口径录入，本区同时承担车辆称重口径和架称重口径的关系说明。
                </p>
                <div style={{ display: "grid", gap: "12px" }}>
                  <FieldBlock label="动车转向架重量 bogie_weight (ton)" />
                  <FieldBlock label="拖车转向架重量 bogie_weight (ton)" />
                </div>
              </section>

              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>空簧特性输入</h3>
                <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                  先选输入模式，再录入对应字段。特征点模式下压力和质量必须分成两个字段；显式公式模式则直接录入空簧线性公式。
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <TogglePill
                    label="特征点拟合"
                    active={airSpringInputMode === "fitted_from_points"}
                    onClick={() => onChangeAirSpringInputMode("fitted_from_points")}
                  />
                  <TogglePill
                    label="显式线性公式"
                    active={airSpringInputMode === "explicit_linear"}
                    onClick={() => onChangeAirSpringInputMode("explicit_linear")}
                  />
                </div>
                <div
                  style={{
                    border: "1px solid #d9c8b5",
                    borderRadius: "16px",
                    background: "#fff6ee",
                    padding: "16px",
                    marginBottom: "16px"
                  }}
                >
                  <strong>单位提示</strong>
                  <p style={{ margin: "8px 0 12px", color: "#6b6259", lineHeight: 1.6 }}>
                    {airSpringInputMode === "fitted_from_points"
                      ? "当前为特征点拟合模式。压力轴单位为 `kPa`，质量轴可按 `ton / kN` 切换。若资料提供的是 `kN`，前端仅做辅助换算后再回到权威输入口径。"
                      : "当前为显式线性公式模式。请直接录入 pressure_kpa = k * sprung_mass_by_spring_ton + b 中的 k 与 b，公式口径保持 `kPa/ton` 和 `kPa`。"}
                  </p>
                  {airSpringInputMode === "fitted_from_points" ? (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <TogglePill
                        label="质量单位：ton"
                        active={airSpringMassUnit === "ton"}
                        onClick={() => onChangeAirSpringMassUnit("ton")}
                      />
                      <TogglePill
                        label="质量单位：kN（前端辅助换算）"
                        active={airSpringMassUnit === "kn"}
                        onClick={() => onChangeAirSpringMassUnit("kn")}
                      />
                    </div>
                  ) : null}
                </div>
                {airSpringInputMode === "fitted_from_points" ? (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <PointRow unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"} index={1} />
                    <PointRow unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"} index={2} />
                    <PointRow unitLabel={airSpringMassUnit === "ton" ? "质量 (ton)" : "质量 (kN)"} index={3} />
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "16px" }}>
                    <div
                      style={{
                        border: "1px solid #d5c9ba",
                        borderRadius: "16px",
                        padding: "16px",
                        background: "#fff"
                      }}
                    >
                      <h4 style={{ margin: "0 0 12px" }}>公式口径说明</h4>
                      <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>
                        当前直接录入单条直线公式 `pressure_kpa = k * sprung_mass_by_spring_ton + b`。其中 `sprung_mass_by_spring_ton` 为单个空簧承担的簧上质量口径。
                      </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <FieldBlock label="空簧线性系数 k (kPa/ton)" />
                      <FieldBlock label="空簧截距 b (kPa)" />
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {activeSection === "base-brake" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>基础制动机械参数</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                本章只处理基础制动机械参数，重点是把单位写清楚，并避免把停放缸参数混进来。
              </p>
              <div
                style={{
                  border: "1px solid #d9c8b5",
                  borderRadius: "16px",
                  background: "#fff6ee",
                  padding: "16px",
                  marginBottom: "16px"
                }}
              >
                <strong>单位提示</strong>
                <p style={{ margin: "8px 0 0", color: "#6b6259", lineHeight: 1.6 }}>
                  本章优先确认 `mm / kN / -` 等单位。停放缸参数不在本章，统一放到“停放校核”章节补录，避免与制动缸参数混填。
                </p>
              </div>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>基础制动缸参数</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock label="制动缸缸径 (mm)" />
                    <FieldBlock label="单缸作用力 (kN)" />
                    <FieldBlock label="制动单元数量 (-)" />
                    <FieldBlock label="制动倍率 Beta (-)" />
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>条件显示项</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock label="轮径 Dw (mm)" />
                    <FieldBlock label="摩擦半径 Rf (mm)" />
                    <FieldBlock label="杠杆比 Lpi / Lo" />
                    <FieldBlock label="基础制动类型" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "parking" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>停放校核</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                本章作为后置补录章节，先看当前是否已补充完整，再分别录入环境条件和停放机械参数。
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", marginBottom: "16px" }}>
                <InfoCard title="当前状态：未补充停放校核" body="当前版本尚未录入线路坡度和停放参数，运行结果中仅保留待补录状态。" />
                <InfoCard title="补录提示" body="先补环境条件，再确认停放缸作用力、单元数量和相关机械参数，完成后再运行校核。" />
              </div>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>环境条件</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock label="AW0 坡度 (‰)" />
                    <FieldBlock label="AW2 坡度 (‰)" />
                    <FieldBlock label="AW3 坡度 (‰)" />
                    <FieldBlock label="线路条件备注" />
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>机械参数</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock label="停放缸作用力 (kN)" />
                    <FieldBlock label="停放制动单元数量 (-)" />
                    <FieldBlock label="停放杠杆比 Lpi / Lo" />
                    <FieldBlock label="停车校核摩擦半径 Rf (mm)" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "calibration" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>标定</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                本章按载重工况组织，而不是先按制动模式组织。先判断每组工况当前是否完整，再进入对应试验点表。
              </p>
              <div style={{ display: "grid", gap: "16px" }}>
                <CalibrationCaseCard
                  title="AW3-AW0 工况"
                  status="当前状态：已完成 aw3_aw0 首轮标定"
                  summary="已完成首轮常用制动与紧急制动标定，可继续替换试验点并重新运行。"
                />
                <CalibrationCaseCard
                  title="AW3-AW2 工况"
                  status="当前状态：待补充 aw3_aw2 标定"
                  summary="当前尚未补 aw3_aw2 试验点，待第二轮试验数据返回后补录。"
                />
              </div>
            </section>
          )}

          {activeSection === "electric" && (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>电制动特性</h3>
              <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
                当前仅做输入补录和摘要展示，不参与 V1 主制动计算。
              </p>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>电制动曲线</h4>
                  <div
                    style={{
                      minHeight: "180px",
                      borderRadius: "14px",
                      border: "1px dashed #ccbca8",
                      background:
                        "linear-gradient(180deg, rgba(184,100,45,0.08) 0%, rgba(184,100,45,0.02) 100%)",
                      padding: "16px",
                      display: "grid",
                      alignItems: "end"
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        display: "grid",
                        alignItems: "end",
                        color: "#6b6259"
                      }}
                    >
                      曲线预览区：用于查看速度与电制动力关系，帮助快速判断电机特性。
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d5c9ba",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#fff"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px" }}>特性点表</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FieldBlock label="速度 (km/h)" />
                    <FieldBlock label="电制动力 (kN)" />
                    <FieldBlock label="速度 (km/h)" />
                    <FieldBlock label="电制动力 (kN)" />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>说明</h3>
          <ActiveInfoTabs />
          <div style={{ display: "grid", gap: "12px" }}>
            <InfoCard title="当前章节说明" body="优先确认车辆称重和转向架参数的口径关系，再继续空簧特性输入。" />
            <InfoCard title="待确认项" body="1. 录入口径切换；2. ton / kN 辅助换算；3. 基础机械参数错误回填。" />
          </div>
        </aside>
      </div>
    </div>
  );
}
