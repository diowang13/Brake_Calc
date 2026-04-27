import type { ReactElement } from "react";

import {
  ghostActionStyle,
  groupedTableCellStyle,
  panelStyle,
  primaryActionStyle,
  secondaryActionStyle,
  stripedBlueCellStyle,
  stripedOrangeCellStyle,
  tableCellStyle,
  tableHeaderStyle,
  tableStyle
} from "../app/styles";
import { InfoCard, TogglePill } from "../components/ui";

export function ResultPage({
  pressureMatrixView,
  onChangePressureMatrixView,
  onBackToOverview
}: {
  pressureMatrixView: "load" | "controller";
  onChangePressureMatrixView: (view: "load" | "controller") => void;
  onBackToOverview: () => void;
}): ReactElement {
  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "32px" }}>运行结果</h2>
            <p style={{ margin: "8px 0 0", color: "#6b6259" }}>
              结果页先看摘要和制动性能检查，再看压力矩阵和控制器开发参数。
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
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        <InfoCard title="运行状态 / 最后一次运行时间" body="运行成功 · 2026-04-27 13:40" />
        <InfoCard title="警告" body="当前存在 1 条警告：AW2 使用 AW3 fallback 结果参与检查。" />
        <InfoCard title="自动调整" body="已触发 1 条自动调整：EB 自动切换为等黏着分配。" />
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
                <th style={tableHeaderStyle}>最大常用制动</th>
                <th style={tableHeaderStyle}>快速制动</th>
                <th style={tableHeaderStyle}>紧急制动</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tableCellStyle}>80</td>
                <td style={tableCellStyle}>控制减速度 1.02 / 平均减速度 0.96 / 制动距离 214</td>
                <td style={tableCellStyle}>控制减速度 1.08 / 平均减速度 1.01 / 制动距离 206</td>
                <td style={tableCellStyle}>控制减速度 1.15 / 平均减速度 1.07 / 制动距离 198</td>
              </tr>
              <tr>
                <td style={tableCellStyle}>120</td>
                <td style={tableCellStyle}>控制减速度 1.01 / 平均减速度 0.95 / 制动距离 468</td>
                <td style={tableCellStyle}>控制减速度 1.07 / 平均减速度 1.00 / 制动距离 452</td>
                <td style={tableCellStyle}>控制减速度 1.14 / 平均减速度 1.06 / 制动距离 438</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>压力矩阵</h3>
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
                  <th style={tableHeaderStyle}>最大常用制动</th>
                  <th style={tableHeaderStyle}>快速制动</th>
                  <th style={tableHeaderStyle}>紧急制动</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={groupedTableCellStyle} rowSpan={2}>
                    AW0
                  </td>
                  <td style={stripedBlueCellStyle}>拖架 1</td>
                  <td style={stripedBlueCellStyle}>68</td>
                  <td style={stripedBlueCellStyle}>72</td>
                  <td style={stripedBlueCellStyle}>75</td>
                </tr>
                <tr>
                  <td style={stripedOrangeCellStyle}>动架 2</td>
                  <td style={stripedOrangeCellStyle}>70</td>
                  <td style={stripedOrangeCellStyle}>74</td>
                  <td style={stripedOrangeCellStyle}>78</td>
                </tr>
                <tr>
                  <td style={groupedTableCellStyle} rowSpan={2}>
                    AW3
                  </td>
                  <td style={stripedBlueCellStyle}>拖架 1</td>
                  <td style={stripedBlueCellStyle}>83</td>
                  <td style={stripedBlueCellStyle}>88</td>
                  <td style={stripedBlueCellStyle}>92</td>
                </tr>
                <tr>
                  <td style={stripedOrangeCellStyle}>动架 2</td>
                  <td style={stripedOrangeCellStyle}>86</td>
                  <td style={stripedOrangeCellStyle}>90</td>
                  <td style={stripedOrangeCellStyle}>95</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>控制器</th>
                  <th style={tableHeaderStyle}>载荷类型</th>
                  <th style={tableHeaderStyle}>最大常用制动</th>
                  <th style={tableHeaderStyle}>快速制动</th>
                  <th style={tableHeaderStyle}>紧急制动</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={groupedTableCellStyle} rowSpan={2}>
                    拖架 1
                  </td>
                  <td style={stripedBlueCellStyle}>AW0</td>
                  <td style={stripedBlueCellStyle}>68</td>
                  <td style={stripedBlueCellStyle}>72</td>
                  <td style={stripedBlueCellStyle}>75</td>
                </tr>
                <tr>
                  <td style={stripedOrangeCellStyle}>AW3</td>
                  <td style={stripedOrangeCellStyle}>83</td>
                  <td style={stripedOrangeCellStyle}>88</td>
                  <td style={stripedOrangeCellStyle}>92</td>
                </tr>
                <tr>
                  <td style={groupedTableCellStyle} rowSpan={2}>
                    动架 2
                  </td>
                  <td style={stripedBlueCellStyle}>AW0</td>
                  <td style={stripedBlueCellStyle}>70</td>
                  <td style={stripedBlueCellStyle}>74</td>
                  <td style={stripedBlueCellStyle}>78</td>
                </tr>
                <tr>
                  <td style={stripedOrangeCellStyle}>AW3</td>
                  <td style={stripedOrangeCellStyle}>86</td>
                  <td style={stripedOrangeCellStyle}>90</td>
                  <td style={stripedOrangeCellStyle}>95</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>控制器开发参数</h3>
        <p style={{ margin: "0 0 16px", color: "#6b6259", lineHeight: 1.6 }}>
          当前按基础计算结果生成控制器开发参数。当前未配置标定，因此以下参数用于未标定开发输入。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <InfoCard title="常用制动开发参数" body="BCP0_for_code = 61 kPa；k_for_code = [0, 35] -> 1.08, (35, 70] -> 0.96" />
          <InfoCard title="紧急制动开发参数" body="BCP0_for_code = 68 kPa；k_for_code = [0, 35] -> 1.12, (35, 70] -> 1.01" />
        </div>
      </section>
    </div>
  );
}
