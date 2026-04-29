import { Fragment, type CSSProperties, type ReactElement } from "react";
import type { Report } from "../contracts/report";

import {
  ghostActionStyle,
  groupedTableCellStyle,
  panelStyle,
  secondaryActionStyle,
  stripedBlueCellStyle,
  stripedOrangeCellStyle,
  tableCellStyle,
  tableHeaderStyle,
  tableStyle
} from "../app/styles";
import { TogglePill } from "../components/ui";

const brakeGroups = [
  { key: "fsb", label: "最大常用制动" },
  { key: "eb", label: "紧急制动" },
  { key: "fb", label: "快速制动" }
] as const;

const performanceRows = [
  {
    speed: "80 km/h",
    fsb: ["1.02", "0.96", "214 m"],
    eb: ["1.15", "1.07", "198 m"],
    fb: ["1.08", "1.01", "206 m"]
  },
  {
    speed: "100 km/h",
    fsb: ["1.02", "0.96", "332 m"],
    eb: ["1.15", "1.07", "306 m"],
    fb: ["1.08", "1.01", "319 m"]
  },
  {
    speed: "120 km/h",
    fsb: ["1.01", "0.95", "468 m"],
    eb: ["1.14", "1.06", "438 m"],
    fb: ["1.07", "1.00", "452 m"]
  }
] as const;

const matrixRows = [
  { load: "AW0", controller: "拖架 1", mass: "31.24", spring: "245", fsb: "68", fb: "72", eb: "75" },
  { load: "AW0", controller: "动架 2", mass: "34.18", spring: "263", fsb: "70", fb: "74", eb: "78" },
  { load: "AW3", controller: "拖架 1", mass: "43.86", spring: "352", fsb: "83", fb: "88", eb: "92" },
  { load: "AW3", controller: "动架 2", mass: "47.12", spring: "376", fsb: "86", fb: "90", eb: "95" }
] as const;

const controllerMatrixRows = [matrixRows[0], matrixRows[2], matrixRows[1], matrixRows[3]] as const;

function formatFixed(value: number): string {
  return value.toFixed(2);
}

function SummaryCard({ icon, title, body }: { icon: string; title: string; body: string }): ReactElement {
  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "16px",
        padding: "16px",
        background: "#fff"
      }}
    >
      <h4
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          margin: "0 0 8px"
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: "20px",
            height: "20px",
            borderRadius: "999px",
            border: "1px solid #c7a27f",
            background: "#fff1e3",
            color: "#8d4c22",
            fontSize: "13px",
            lineHeight: 1
          }}
        >
          {icon}
        </span>
        {title}
      </h4>
      <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

function ParameterCard({ title, value, note }: { title: string; value: string; note: string }): ReactElement {
  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "14px",
        padding: "14px",
        background: "#fff"
      }}
    >
      <div style={{ color: "#6b6259", fontSize: "13px", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontFamily: "Consolas, monospace", fontSize: "18px", fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#6b6259", fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

function FormulaBlock({ title, lines }: { title: string; lines: string[] }): ReactElement {
  return (
    <div
      style={{
        border: "1px dashed #c7a27f",
        borderRadius: "14px",
        padding: "14px",
        background: "#fffaf4"
      }}
    >
      <h4 style={{ margin: "0 0 10px" }}>{title}</h4>
      <div style={{ display: "grid", gap: "6px", fontFamily: "Consolas, monospace", fontSize: "14px" }}>
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function CurveSketch({ title, color }: { title: string; color: string }): ReactElement {
  const lineStyle: CSSProperties = {
    height: "3px",
    background: color,
    alignSelf: "center"
  };

  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "14px",
        padding: "14px",
        background:
          "linear-gradient(#efe4d7 1px, transparent 1px), linear-gradient(90deg, #efe4d7 1px, transparent 1px), #fff",
        backgroundSize: "36px 36px"
      }}
    >
      <h4 style={{ margin: "0 0 14px" }}>{title}</h4>
      <div
        aria-label={title}
        style={{
          height: "112px",
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr",
          alignItems: "center",
          gap: "0"
        }}
      >
        <div style={lineStyle} />
        <div
          style={{
            height: "3px",
            background: color,
            transform: "rotate(9deg)",
            transformOrigin: "center"
          }}
        />
        <div style={lineStyle} />
      </div>
      <div style={{ color: "#6b6259", fontSize: "13px" }}>低段常数 + 中段线性 + 高段常数</div>
    </div>
  );
}

function MetricCells({ values }: { values: readonly string[] }): ReactElement {
  return (
    <>
      <td style={tableCellStyle}>{values[0]}</td>
      <td style={tableCellStyle}>{values[1]}</td>
      <td style={tableCellStyle}>{values[2]}</td>
    </>
  );
}

export function ResultPage({
  report,
  requiredSafetyMargin,
  pressureMatrixView,
  onChangePressureMatrixView,
  onBackToOverview
}: {
  report: Report;
  requiredSafetyMargin: number;
  pressureMatrixView: "load" | "controller";
  onChangePressureMatrixView: (view: "load" | "controller") => void;
  onBackToOverview: () => void;
}): ReactElement {
  const parkingRowsByLoadGroup = Object.entries(report.parking_brake_check_results_by_load_group);
  const parkingReference = parkingRowsByLoadGroup[0]?.[1] ?? report.parking_brake_check_result;
  const parkingPerCarEntries = parkingReference ? Object.entries(parkingReference.per_car) : [];
  const parkingCars = parkingPerCarEntries.map((_, index) => `${index + 1}车`);
  const wholeTrainFpb = parkingReference?.whole_train.F_PB ?? 0;
  const worstWholeTrainIncline = parkingRowsByLoadGroup.reduce(
    (maxIncline, [, result]) => Math.max(maxIncline, result.whole_train.incline_force),
    0
  );
  const parkingUnitForce = parkingPerCarEntries[0]?.[1].F_N_PB ?? 0;
  const parkingPerCarForce = parkingPerCarEntries[0]?.[1].F_PB ?? 0;

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start"
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "30px" }}>运行结果</h2>
          <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
            先确认摘要和制动性能检查，再查看压力矩阵与控制器开发参数。
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button type="button" style={ghostActionStyle}>
            返回配置
          </button>
          <button type="button" style={secondaryActionStyle} onClick={onBackToOverview}>
            回到总览
          </button>
        </div>
      </section>

      <section
        style={{
          ...panelStyle,
          borderColor: "#c7a27f",
          background: "#fffaf4"
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>结果摘要</h3>
          <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
            这三项先判断本次计算是否可用，再进入明细表。
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "14px",
            marginTop: "16px"
          }}
        >
          <SummaryCard icon="✓" title="运行状态 / 最后一次运行时间" body="运行成功 · 2026-04-27 13:40" />
          <SummaryCard icon="!" title="警告" body="当前存在 1 条警告：AW2 使用 AW3 fallback 结果参与检查。" />
          <SummaryCard icon="↻" title="自动调整" body="已触发 1 条自动调整：EB 自动切换为等黏着分配。" />
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>制动性能检查</h3>
        <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
          当前配置满足主要技术条件；下表优先核对不同初速度下的控制减速度、平均减速度和制动距离。
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>初速度 (km/h)</th>
                {brakeGroups.map((group) => (
                  <th key={group.key} colSpan={3} style={tableHeaderStyle}>
                    {group.label}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={tableHeaderStyle} />
                {brakeGroups.map((group) => (
                  <Fragment key={group.key}>
                    <th key={`${group.key}-control`} style={tableHeaderStyle}>
                      控制减速度
                    </th>
                    <th key={`${group.key}-mean`} style={tableHeaderStyle}>
                      平均减速度
                    </th>
                    <th key={`${group.key}-distance`} style={tableHeaderStyle}>
                      制动距离
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {performanceRows.map((row) => (
                <tr key={row.speed}>
                  <td style={groupedTableCellStyle}>{row.speed}</td>
                  <MetricCells values={row.fsb} />
                  <MetricCells values={row.eb} />
                  <MetricCells values={row.fb} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>压力矩阵</h3>
            <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
              同一矩阵同时展示动态载荷、标准空簧压力和各制动类型 BCP 压力标准。
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <TogglePill
              label="按载荷类型"
              active={pressureMatrixView === "load"}
              onClick={() => onChangePressureMatrixView("load")}
            />
            <TogglePill
              label="按控制器"
              active={pressureMatrixView === "controller"}
              onClick={() => onChangePressureMatrixView("controller")}
            />
          </div>
        </div>
        <div style={{ overflowX: "auto", marginTop: "16px" }}>
          {pressureMatrixView === "load" ? (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>载荷类型</th>
                  <th style={tableHeaderStyle}>控制器</th>
                  <th style={tableHeaderStyle}>动态载荷 mass_dyn_t (ton)</th>
                  <th style={tableHeaderStyle}>标准空簧压力 spring_kPa</th>
                  <th style={tableHeaderStyle}>最大常用制动 BCP</th>
                  <th style={tableHeaderStyle}>快速制动 BCP</th>
                  <th style={tableHeaderStyle}>紧急制动 BCP</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, index) => {
                  const rowStyle = row.controller === "拖架 1" ? stripedBlueCellStyle : stripedOrangeCellStyle;

                  return (
                    <tr key={`${row.load}-${row.controller}`}>
                      {index % 2 === 0 ? (
                        <td style={groupedTableCellStyle} rowSpan={2}>
                          {row.load}
                        </td>
                      ) : null}
                      <td style={rowStyle}>{row.controller}</td>
                      <td style={rowStyle}>{row.mass}</td>
                      <td style={rowStyle}>{row.spring}</td>
                      <td style={rowStyle}>{row.fsb}</td>
                      <td style={rowStyle}>{row.fb}</td>
                      <td style={rowStyle}>{row.eb}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>控制器</th>
                  <th style={tableHeaderStyle}>载荷 / 指标</th>
                  <th style={tableHeaderStyle}>数值</th>
                  <th style={tableHeaderStyle}>最大常用制动 BCP</th>
                  <th style={tableHeaderStyle}>快速制动 BCP</th>
                  <th style={tableHeaderStyle}>紧急制动 BCP</th>
                </tr>
              </thead>
              <tbody>
                {controllerMatrixRows.map((row, index) => {
                  const rowStyle = row.load === "AW0" ? stripedBlueCellStyle : stripedOrangeCellStyle;

                  return (
                    <Fragment key={`${row.controller}-${row.load}`}>
                      <tr key={`${row.controller}-${row.load}-mass`}>
                        {index % 2 === 0 ? (
                          <td style={groupedTableCellStyle} rowSpan={4}>
                            {row.controller}
                          </td>
                        ) : null}
                        <td style={rowStyle}>{`${row.load} / mass_dyn_t`}</td>
                        <td style={rowStyle}>{`${row.mass} ton`}</td>
                        <td style={rowStyle} rowSpan={2}>
                          {row.fsb}
                        </td>
                        <td style={rowStyle} rowSpan={2}>
                          {row.fb}
                        </td>
                        <td style={rowStyle} rowSpan={2}>
                          {row.eb}
                        </td>
                      </tr>
                      <tr key={`${row.controller}-${row.load}-spring`}>
                        <td style={rowStyle}>{`${row.load} / spring_kPa`}</td>
                        <td style={rowStyle}>{`${row.spring} kPa`}</td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>控制器开发参数</h3>
        <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
          左侧给出可直接交付控制器开发的参数；右侧用分段示意表达标定后的 k_for_code 曲线。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", alignItems: "start" }}>
          <div style={{ display: "grid", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <ParameterCard title="常用制动 k_for_code" value="108 / 96" note="未标定时来自基础计算；标定后按分段公式输出。" />
              <ParameterCard title="常用制动 BCP0_for_code" value="65 kPa" note="按 5 kPa 口径向上圆整。" />
              <ParameterCard title="紧急制动 k_for_code" value="112 / 101" note="架控 EB 标定后输出分段公式。" />
              <ParameterCard title="紧急制动 BCP0_for_code" value="70 kPa" note="架控 EB 使用最终生效值。" />
            </div>
            <div
              style={{
                border: "1px solid #e0c4aa",
                borderRadius: "14px",
                padding: "14px",
                background: "#fff6ee",
                color: "#6b6259",
                lineHeight: 1.6
              }}
            >
              车控 EB 实际 BCP 压力标定 V1.0 暂不支持，需由开发人员线下处理，V1.1 接入。
            </div>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            <h3 style={{ margin: 0 }}>标定摘要</h3>
            <FormulaBlock
              title="常用制动 k_for_code 分段公式"
              lines={["k_f(f) = 108, if f < 35", "k_f(f) = 0.96f + 74.4, if 35 <= f <= 70", "k_f(f) = 96, if f > 70"]}
            />
            <CurveSketch title="常用制动 k_for_code 分段曲线" color="#a95522" />
            <FormulaBlock
              title="紧急制动 k_for_code 分段公式"
              lines={["k_f(f) = 112, if f < 35", "k_f(f) = 1.01f + 76.65, if 35 <= f <= 70", "k_f(f) = 101, if f > 70"]}
            />
            <CurveSketch title="紧急制动 k_for_code 分段曲线" color="#5c6f93" />
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>停放校核结果</h3>
        <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
          本区只展示停放制动力校核输出，输入项仍在工作台“停放校核”章节维护。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "16px" }}>
          <ParameterCard
            title="F_N_PB 单个制动单元双侧作用力"
            value={`${formatFixed(parkingUnitForce)} kN`}
            note="由 Fp、Fs1、Fs2、Lpi、eta_pi、Lo、eta_o 计算得到。"
          />
          <ParameterCard
            title="F_PB 每车停放制动力"
            value={`${formatFixed(parkingPerCarForce)} kN`}
            note="结合基础制动几何换算、停放缸数量和 xi0。"
          />
          <ParameterCard
            title="全列停放制动力"
            value={`${formatFixed(wholeTrainFpb)} kN`}
            note={`要求防滚余量：${formatFixed(requiredSafetyMargin)}`}
          />
          <ParameterCard
            title="最恶劣工况下的倾斜力"
            value={`${formatFixed(worstWholeTrainIncline)} kN`}
            note="取各已配置载荷工况中的全列倾斜力最大值。"
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeaderStyle} />
                {parkingCars.map((car) => (
                  <th key={car} style={tableHeaderStyle}>
                    {car}
                  </th>
                ))}
                <th style={tableHeaderStyle}>全列合计</th>
                <th style={tableHeaderStyle}>全列防滚余量</th>
              </tr>
            </thead>
            <tbody>
              {parkingReference ? (
                <tr>
                  <td style={groupedTableCellStyle}>单车停放制动力</td>
                  {parkingPerCarEntries.map(([carName, values], index) => (
                    <td key={`parking-force-${carName}-${parkingCars[index]}`} style={tableCellStyle}>
                      {formatFixed(values.F_PB)}
                    </td>
                  ))}
                  <td style={tableCellStyle}>{formatFixed(parkingReference.whole_train.F_PB)}</td>
                  <td style={tableCellStyle}>-</td>
                </tr>
              ) : null}
              {parkingRowsByLoadGroup.map(([loadGroup, result]) => {
                const isFailing = result.whole_train.safety_margin < requiredSafetyMargin;
                return (
                  <tr key={loadGroup}>
                    <td style={groupedTableCellStyle}>{`${loadGroup} 单车倾斜力`}</td>
                    {parkingPerCarEntries.map(([carName], index) => (
                      <td key={`${loadGroup}-${carName}-${parkingCars[index]}`} style={tableCellStyle}>
                        {formatFixed(result.per_car[carName]?.incline_force ?? 0)}
                      </td>
                    ))}
                    <td style={tableCellStyle}>{formatFixed(result.whole_train.incline_force)}</td>
                    <td
                      style={{
                        ...tableCellStyle,
                        color: isFailing ? "#c64532" : tableCellStyle.color,
                        fontWeight: isFailing ? 700 : tableCellStyle.fontWeight
                      }}
                    >
                      {formatFixed(result.whole_train.safety_margin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
