import { Fragment, type ReactElement } from "react";
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

const BRAKE_TYPE_PRIORITY = ["FSB", "EB", "FB"] as const;

function brakeTypeLabel(brakeType: string): string {
  if (brakeType === "FSB") {
    return "最大常用制动";
  }
  if (brakeType === "EB") {
    return "紧急制动";
  }
  if (brakeType === "FB") {
    return "快速制动";
  }
  return brakeType;
}

function loadGroupSortKey(loadGroup: string): number {
  if (loadGroup === "AW0") {
    return 0;
  }
  if (loadGroup === "AW2") {
    return 1;
  }
  if (loadGroup === "AW3") {
    return 2;
  }
  return 999;
}

function controllerSortKey(controller: string): [number, number, string] {
  const trailerPriority = controller.includes("trailer") ? 0 : 1;
  const suffix = Number.parseInt(controller.match(/(\d+)$/)?.[1] ?? "99999", 10);
  return [trailerPriority, Number.isNaN(suffix) ? 99999 : suffix, controller];
}

function getFirstCalibrationKForCode(summary: Record<string, unknown> | null): number | null {
  if (summary === null) {
    return null;
  }
  const inputPoints = summary.input_points;
  if (!Array.isArray(inputPoints) || inputPoints.length === 0) {
    return null;
  }
  const firstPoint = inputPoints[0];
  if (typeof firstPoint !== "object" || firstPoint === null) {
    return null;
  }
  const kForCode = (firstPoint as Record<string, unknown>).k_for_code;
  return typeof kForCode === "number" ? kForCode : null;
}

function getCalibrationBcp0ForCode(summary: Record<string, unknown> | null): number | null {
  if (summary === null) {
    return null;
  }
  const bcp0 = summary.BCP0_for_code;
  return typeof bcp0 === "number" ? bcp0 : null;
}

function formatFixed(value: number): string {
  return value.toFixed(2);
}

function formatOptional(value: number | undefined, fractionDigits = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(fractionDigits);
}

type CalibrationCurvePoint = {
  label: string;
  force_kN: number;
  k_for_code: number;
};

function getCalibrationCurvePoints(summary: Record<string, unknown> | null): CalibrationCurvePoint[] {
  if (summary === null || !Array.isArray(summary.curve_points)) {
    return [];
  }
  return summary.curve_points
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }
      const record = item as Record<string, unknown>;
      return {
        label: typeof record.label === "string" ? record.label : "",
        force_kN: typeof record.force_kN === "number" ? record.force_kN : Number.NaN,
        k_for_code: typeof record.k_for_code === "number" ? record.k_for_code : Number.NaN,
      };
    })
    .filter(
      (item): item is CalibrationCurvePoint =>
        item !== null &&
        item.label.length > 0 &&
        Number.isFinite(item.force_kN) &&
        Number.isFinite(item.k_for_code)
    );
}

function getLinearFormula(summary: Record<string, unknown> | null): string | null {
  if (summary === null || typeof summary.linear_formula_for_code !== "string") {
    return null;
  }
  return summary.linear_formula_for_code;
}

function hasMeaningfulSpeedCheck(
  perSpeed: Record<string, { beta_used?: number; requirement_a_mean?: number; theoretical_distance_m?: number }>
): boolean {
  return Object.values(perSpeed).some(
    (value) =>
      typeof value.beta_used === "number" ||
      typeof value.requirement_a_mean === "number" ||
      typeof value.theoretical_distance_m === "number"
  );
}

function hasMeaningfulPressureEntries(
  pressureByLoad: Record<string, Record<string, Record<string, number>>>,
  brakeType: string
): boolean {
  return Object.values(pressureByLoad).some((perBrakeType) =>
    Object.values(perBrakeType[brakeType] ?? {}).some((value) => typeof value === "number")
  );
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

function InfoSummary({ title, body }: { title: string; body: string }): ReactElement {
  return (
    <div
      style={{
        border: "1px dashed #c7a27f",
        borderRadius: "14px",
        padding: "14px",
        background: "#fffaf4",
      }}
    >
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      <p style={{ margin: 0, color: "#6b6259", lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

function renderCalibrationSummaryLine(
  title: string,
  summary: Record<string, unknown> | null
): ReactElement {
  const bcp0ForCode = getCalibrationBcp0ForCode(summary);
  const kForCode = getFirstCalibrationKForCode(summary);
  return (
    <div style={{ color: "#6b6259", lineHeight: 1.6 }}>
      <strong>{title}</strong>
      {`: BCP0_for_code: ${typeof bcp0ForCode === "number" ? bcp0ForCode : "-"}, k_for_code: ${
        typeof kForCode === "number" ? kForCode : "-"
      }`}
    </div>
  );
}

function renderSegmentLines(title: string, summary: Record<string, unknown> | null): ReactElement {
  const curvePoints = getCalibrationCurvePoints(summary).sort((left, right) => left.force_kN - right.force_kN);
  const formula = getLinearFormula(summary);
  if (curvePoints.length < 2) {
    return <div style={{ color: "#6b6259" }}>{`${title}: -`}</div>;
  }
  const [lowPoint, highPoint] = curvePoints;
  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "12px",
        padding: "10px 12px",
        background: "#fff",
        display: "grid",
        gap: "4px",
      }}
    >
      <strong>{title}</strong>
      <div style={{ color: "#6b6259", fontSize: "13px", fontFamily: "Consolas, monospace" }}>
        {`f < ${lowPoint.force_kN.toFixed(2)}: ${lowPoint.k_for_code}`}
      </div>
      <div style={{ color: "#6b6259", fontSize: "13px", fontFamily: "Consolas, monospace" }}>
        {`${lowPoint.force_kN.toFixed(2)} <= f <= ${highPoint.force_kN.toFixed(2)}: ${formula ?? "-"}`}
      </div>
      <div style={{ color: "#6b6259", fontSize: "13px", fontFamily: "Consolas, monospace" }}>
        {`f > ${highPoint.force_kN.toFixed(2)}: ${highPoint.k_for_code}`}
      </div>
    </div>
  );
}

function renderCurveChart(
  title: string,
  summary: Record<string, unknown> | null,
  domain: { minX: number; maxX: number; minY: number; maxY: number }
): ReactElement {
  const curvePoints = getCalibrationCurvePoints(summary).sort((left, right) => left.force_kN - right.force_kN);
  if (curvePoints.length < 2) {
    return (
      <div style={{ border: "1px dashed #d5c9ba", borderRadius: "8px", padding: "20px", color: "#6b6259" }}>
        {`${title}: 未提供标定分段点`}
      </div>
    );
  }
  const [lowPoint, highPoint] = curvePoints;
  const width = 340;
  const height = 220;
  const leftPad = 44;
  const rightPad = 10;
  const topPad = 10;
  const bottomPad = 30;
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = height - topPad - bottomPad;
  const mapX = (x: number): number => leftPad + ((x - domain.minX) / (domain.maxX - domain.minX || 1)) * plotWidth;
  const mapY = (y: number): number =>
    topPad + plotHeight - ((y - domain.minY) / (domain.maxY - domain.minY || 1)) * plotHeight;
  const path = [
    `M ${mapX(domain.minX)} ${mapY(lowPoint.k_for_code)}`,
    `L ${mapX(lowPoint.force_kN)} ${mapY(lowPoint.k_for_code)}`,
    `L ${mapX(highPoint.force_kN)} ${mapY(highPoint.k_for_code)}`,
    `L ${mapX(domain.maxX)} ${mapY(highPoint.k_for_code)}`,
  ].join(" ");
  const ticksX = Array.from({ length: 5 }, (_, index) => domain.minX + ((domain.maxX - domain.minX) * index) / 4);
  const ticksY = Array.from({ length: 5 }, (_, index) => domain.minY + ((domain.maxY - domain.minY) * index) / 4);

  return (
    <div
      style={{
        border: "1px solid #d5c9ba",
        borderRadius: "14px",
        padding: "12px",
        background: "#fff",
        display: "grid",
        gap: "8px",
      }}
    >
      <strong>{title}</strong>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title} 分段曲线示意`}
        style={{ border: "1px dashed #d5c9ba", borderRadius: "8px", background: "#fffaf4" }}
      >
        <line x1={leftPad} y1={topPad + plotHeight} x2={leftPad + plotWidth} y2={topPad + plotHeight} stroke="#b7aa9a" />
        <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + plotHeight} stroke="#b7aa9a" />
        {ticksX.map((tick) => (
          <g key={`${title}-x-${tick}`}>
            <line x1={mapX(tick)} y1={topPad} x2={mapX(tick)} y2={topPad + plotHeight} stroke="#eee3d8" />
            <text x={mapX(tick)} y={height - 8} textAnchor="middle" fontSize="11" fill="#6b6259">
              {tick.toFixed(1)}
            </text>
          </g>
        ))}
        {ticksY.map((tick) => (
          <g key={`${title}-y-${tick}`}>
            <line x1={leftPad} y1={mapY(tick)} x2={leftPad + plotWidth} y2={mapY(tick)} stroke="#eee3d8" />
            <text x={leftPad - 6} y={mapY(tick) + 4} textAnchor="end" fontSize="11" fill="#6b6259">
              {tick.toFixed(0)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#c64532" strokeWidth="2" />
        <text x={leftPad + plotWidth / 2} y={height - 2} textAnchor="middle" fontSize="11" fill="#6b6259">
          f (kN)
        </text>
        <text
          x={10}
          y={topPad + plotHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fill="#6b6259"
          transform={`rotate(-90 10 ${topPad + plotHeight / 2})`}
        >
          k_for_code
        </text>
      </svg>
    </div>
  );
}

function MetricCells({ values }: { values: string[] }): ReactElement {
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
  controllerType,
  controllerOrder,
  runtimeStatus,
  pressureMatrixView,
  onChangePressureMatrixView,
  onBackToWorkbench,
  onBackToOverview
}: {
  report: Report;
  requiredSafetyMargin: number;
  controllerType: "car" | "bogie";
  controllerOrder: string[];
  runtimeStatus: "idle" | "succeeded" | "failed";
  pressureMatrixView: "load" | "controller";
  onChangePressureMatrixView: (view: "load" | "controller") => void;
  onBackToWorkbench: () => void;
  onBackToOverview: () => void;
}): ReactElement {
  const parkingRowsByLoadGroup = Object.entries(report.parking_brake_check_results_by_load_group);
  const warnings = Array.isArray(report.warnings) ? report.warnings : [];
  const autoAdjustments = Array.isArray(report.auto_adjustments) ? report.auto_adjustments : [];
  const parkingReference = report.parking_brake_check_result ?? parkingRowsByLoadGroup[0]?.[1];
  const parkingPerCarEntries = parkingReference ? Object.entries(parkingReference.per_car) : [];
  const parkingCars = parkingPerCarEntries.map(([carName]) => carName);
  const wholeTrainFpb = parkingReference?.whole_train.F_PB ?? 0;
  const worstWholeTrainIncline = parkingRowsByLoadGroup.reduce(
    (maxIncline, [, result]) => Math.max(maxIncline, result.whole_train.incline_force),
    0
  );
  const parkingUnitForce =
    parkingPerCarEntries.length === 0
      ? 0
      : parkingPerCarEntries.reduce((sum, [, value]) => sum + value.F_N_PB, 0) / parkingPerCarEntries.length;
  const parkingPerCarForce =
    parkingPerCarEntries.length === 0
      ? 0
      : parkingPerCarEntries.reduce((sum, [, value]) => sum + value.F_PB, 0) / parkingPerCarEntries.length;
  const speedCheckMatrix = report.theoretical_speed_checks ?? {};
  const speedSet = new Set<string>();
  Object.values(speedCheckMatrix).forEach((perSpeed) => {
    Object.keys(perSpeed).forEach((speed) => speedSet.add(speed));
  });
  const sortedSpeeds = [...speedSet].sort((left, right) => Number(left) - Number(right));
  const speedBrakeTypes = [
    ...BRAKE_TYPE_PRIORITY.filter((key) => {
      const perSpeed = speedCheckMatrix[key];
      return perSpeed !== undefined && hasMeaningfulSpeedCheck(perSpeed);
    }),
    ...Object.keys(speedCheckMatrix)
      .filter((key) => !BRAKE_TYPE_PRIORITY.includes(key as (typeof BRAKE_TYPE_PRIORITY)[number]))
      .filter((key) => hasMeaningfulSpeedCheck(speedCheckMatrix[key] ?? {}))
      .sort(),
  ];
  const performanceRows = sortedSpeeds.map((speed) => {
    const perBrakeType: Record<string, string[]> = {};
    speedBrakeTypes.forEach((brakeType) => {
      const values = speedCheckMatrix[brakeType]?.[speed];
      perBrakeType[brakeType] = [
        formatOptional(values?.beta_used, 3),
        formatOptional(values?.requirement_a_mean, 3),
        typeof values?.theoretical_distance_m === "number"
          ? `${values.theoretical_distance_m.toFixed(0)} m`
          : "-",
      ];
    });
    return {
      speed: `${speed} km/h`,
      perBrakeType,
    };
  });
  const loadSummary = report.load_summary ?? {};
  const pressureByLoad = report.controller_pressure_standards ?? {};
  const pressureBrakeTypeSet = new Set<string>();
  Object.values(pressureByLoad).forEach((perBrakeType) => {
    Object.keys(perBrakeType).forEach((brakeType) => pressureBrakeTypeSet.add(brakeType));
  });
  const pressureBrakeTypes = [
    ...BRAKE_TYPE_PRIORITY.filter(
      (key) => pressureBrakeTypeSet.has(key) && hasMeaningfulPressureEntries(pressureByLoad, key)
    ),
    ...[...pressureBrakeTypeSet]
      .filter((key) => !BRAKE_TYPE_PRIORITY.includes(key as (typeof BRAKE_TYPE_PRIORITY)[number]))
      .filter((key) => hasMeaningfulPressureEntries(pressureByLoad, key))
      .sort(),
  ];
  const loadGroupsFromReport = Object.keys(loadSummary);
  const sortedLoadGroups =
    loadGroupsFromReport.every((item) => /^AW\d+$/.test(item))
      ? [...loadGroupsFromReport].sort(
          (left, right) =>
            loadGroupSortKey(left) - loadGroupSortKey(right) || left.localeCompare(right)
        )
      : loadGroupsFromReport;
  const matrixRows = sortedLoadGroups.flatMap((loadGroup) => {
    const perController = loadSummary[loadGroup] ?? {};
    const reportControllerNames = Object.keys(perController);
    const orderedControllers = [
      ...controllerOrder.filter((name) => reportControllerNames.includes(name)),
      ...reportControllerNames.filter((name) => !controllerOrder.includes(name)),
    ];
    return orderedControllers.map((controller) => ({
      load: loadGroup,
      controller,
      mass: formatOptional(perController[controller]?.mass_dynamic),
      spring: formatOptional(perController[controller]?.spring_pressure, 0),
      pressureByBrakeType: Object.fromEntries(
        pressureBrakeTypes.map((brakeType) => [
          brakeType,
          formatOptional(pressureByLoad[loadGroup]?.[brakeType]?.[controller], 0),
        ])
      ),
    }));
  });
  const sortedMatrixRows = matrixRows;
  const controllerMap = new Map<string, typeof sortedMatrixRows>();
  sortedMatrixRows.forEach((row) => {
    const existing = controllerMap.get(row.controller) ?? [];
    existing.push(row);
    controllerMap.set(row.controller, existing);
  });
  const controllerMatrixRows = [...controllerMap.entries()]
    .sort((left, right) => {
      const leftOrder = controllerOrder.indexOf(left[0]);
      const rightOrder = controllerOrder.indexOf(right[0]);
      if (leftOrder !== -1 || rightOrder !== -1) {
        if (leftOrder === -1) {
          return 1;
        }
        if (rightOrder === -1) {
          return -1;
        }
        return leftOrder - rightOrder;
      }
      const leftKey = controllerSortKey(left[0]);
      const rightKey = controllerSortKey(right[0]);
      if (leftKey[0] !== rightKey[0]) {
        return leftKey[0] - rightKey[0];
      }
      if (leftKey[1] !== rightKey[1]) {
        return leftKey[1] - rightKey[1];
      }
      return leftKey[2].localeCompare(rightKey[2]);
    })
    .map(([controller, rows]) => ({
      controller,
      rows: [...rows].sort(
        (left, right) =>
          loadGroupSortKey(left.load) - loadGroupSortKey(right.load) || left.load.localeCompare(right.load)
      ),
    }));
  const pressureConversion = (report.controller_code_params?.pressure_conversion ??
    {}) as Record<string, Record<string, Record<string, { k_used_for_code?: number; BCP0_used_for_code?: number }>>>;
  const calibrationSummary = (report.calibration_summary ?? {}) as Record<string, unknown>;
  const serviceSummary =
    typeof calibrationSummary.service_brake === "object" && calibrationSummary.service_brake !== null
      ? (calibrationSummary.service_brake as Record<string, unknown>)
      : null;
  const emergencySummary =
    typeof calibrationSummary.emergency_brake === "object" && calibrationSummary.emergency_brake !== null
      ? (calibrationSummary.emergency_brake as Record<string, unknown>)
      : null;
  const serviceCalibrationKForCode = getFirstCalibrationKForCode(serviceSummary);
  const emergencyCalibrationKForCode = getFirstCalibrationKForCode(emergencySummary);
  const serviceCalibrationBcp0ForCode = getCalibrationBcp0ForCode(serviceSummary);
  const emergencyCalibrationBcp0ForCode = getCalibrationBcp0ForCode(emergencySummary);
  const allCurvePoints = [...getCalibrationCurvePoints(serviceSummary), ...getCalibrationCurvePoints(emergencySummary)];
  const sharedDomain =
    allCurvePoints.length >= 2
      ? {
          minX: Math.min(...allCurvePoints.map((item) => item.force_kN)) - 4,
          maxX: Math.max(...allCurvePoints.map((item) => item.force_kN)) + 4,
          minY: Math.min(...allCurvePoints.map((item) => item.k_for_code)) - 80,
          maxY: Math.max(...allCurvePoints.map((item) => item.k_for_code)) + 80,
        }
      : { minX: 0, maxX: 40, minY: 900, maxY: 1300 };
  const runStatusText =
    runtimeStatus === "succeeded"
      ? "运行成功，结果来自后端本次 report。"
      : runtimeStatus === "failed"
        ? "最近一次运行失败，请返回配置修订后重试。"
        : "尚未运行，请先返回配置点击运行。";

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
          <button type="button" style={ghostActionStyle} onClick={onBackToWorkbench}>
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
          <SummaryCard icon="✓" title="运行状态" body={runStatusText} />
          <SummaryCard icon="!" title="警告" body={`当前存在 ${warnings.length} 条警告。`} />
          <SummaryCard icon="↻" title="自动调整" body={`已触发 ${autoAdjustments.length} 条自动调整。`} />
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
                {speedBrakeTypes.map((brakeType) => (
                  <th key={brakeType} colSpan={3} style={tableHeaderStyle}>
                    {brakeTypeLabel(brakeType)}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={tableHeaderStyle} />
                {speedBrakeTypes.map((brakeType) => (
                  <Fragment key={brakeType}>
                    <th key={`${brakeType}-control`} style={tableHeaderStyle}>
                      控制减速度
                    </th>
                    <th key={`${brakeType}-mean`} style={tableHeaderStyle}>
                      平均减速度
                    </th>
                    <th key={`${brakeType}-distance`} style={tableHeaderStyle}>
                      制动距离
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(performanceRows.length > 0 ? performanceRows : [{ speed: "-", perBrakeType: {} as Record<string, string[]> }]).map((row) => (
                <tr key={row.speed}>
                  <td style={groupedTableCellStyle}>{row.speed}</td>
                  {speedBrakeTypes.map((brakeType) => (
                    <MetricCells
                      key={`${row.speed}-${brakeType}`}
                      values={row.perBrakeType[brakeType] ?? ["-", "-", "-"]}
                    />
                  ))}
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
                  {pressureBrakeTypes.map((brakeType) => (
                    <th key={`load-${brakeType}`} style={tableHeaderStyle}>
                      {`${brakeTypeLabel(brakeType)} BCP`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sortedMatrixRows.length > 0 ? sortedMatrixRows : [{ load: "-", controller: "-", mass: "-", spring: "-", pressureByBrakeType: {} as Record<string, string> }]).map((row, index, rows) => {
                  const rowStyle =
                    row.controller.includes("trailer") ? stripedBlueCellStyle : stripedOrangeCellStyle;
                  const isLoadGroupStart = index === 0 || rows[index - 1].load !== row.load;
                  const loadGroupRowSpan = rows.filter((item) => item.load === row.load).length;

                  return (
                    <tr key={`${row.load}-${row.controller}`}>
                      {isLoadGroupStart && row.load !== "-" ? (
                        <td style={groupedTableCellStyle} rowSpan={loadGroupRowSpan}>
                          {row.load}
                        </td>
                      ) : null}
                      <td style={rowStyle}>{row.controller}</td>
                      <td style={rowStyle}>{row.mass}</td>
                      <td style={rowStyle}>{row.spring}</td>
                      {pressureBrakeTypes.map((brakeType) => (
                        <td key={`${row.load}-${row.controller}-${brakeType}`} style={rowStyle}>
                          {row.pressureByBrakeType[brakeType] ?? "-"}
                        </td>
                      ))}
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
                  {pressureBrakeTypes.map((brakeType) => (
                    <th key={`controller-${brakeType}`} style={tableHeaderStyle}>
                      {`${brakeTypeLabel(brakeType)} BCP`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(controllerMatrixRows.length > 0 ? controllerMatrixRows : [{ controller: "-", rows: [{ load: "-", controller: "-", mass: "-", spring: "-", pressureByBrakeType: {} as Record<string, string> }] }]).map(({ controller, rows }) => {
                  const rowStyle =
                    controller.includes("trailer") ? stripedBlueCellStyle : stripedOrangeCellStyle;
                  const controllerRowSpan = rows.length * 2;
                  return rows.map((row, rowIndex) => (
                    <Fragment key={`${controller}-${row.load}`}>
                      <tr key={`${controller}-${row.load}-mass`}>
                        {rowIndex === 0 && controller !== "-" ? (
                          <td style={groupedTableCellStyle} rowSpan={controllerRowSpan}>
                            {controller}
                          </td>
                        ) : null}
                        <td style={rowStyle}>{`${row.load} / mass_dyn_t`}</td>
                        <td style={rowStyle}>{`${row.mass} ton`}</td>
                        {pressureBrakeTypes.map((brakeType) => (
                          <td key={`${controller}-${row.load}-${brakeType}-mass`} style={rowStyle} rowSpan={2}>
                            {row.pressureByBrakeType[brakeType] ?? "-"}
                          </td>
                        ))}
                      </tr>
                      <tr key={`${controller}-${row.load}-spring`}>
                        <td style={rowStyle}>{`${row.load} / spring_kPa`}</td>
                        <td style={rowStyle}>{`${row.spring} kPa`}</td>
                      </tr>
                    </Fragment>
                  ));
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
              <ParameterCard
                title="常用制动 k_for_code"
                value={
                  typeof serviceCalibrationKForCode === "number"
                    ? `${serviceCalibrationKForCode}`
                    : "-"
                }
                note="来自 report.controller_code_params.pressure_conversion。"
              />
              <ParameterCard
                title="常用制动 BCP0_for_code"
                value={
                  typeof serviceCalibrationBcp0ForCode === "number"
                    ? `${serviceCalibrationBcp0ForCode} kPa`
                    : "-"
                }
                note="来自 report.controller_code_params.pressure_conversion。"
              />
              <ParameterCard
                title="紧急制动 k_for_code"
                value={
                  typeof emergencyCalibrationKForCode === "number"
                    ? `${emergencyCalibrationKForCode}`
                    : "-"
                }
                note="来自 report.controller_code_params.pressure_conversion。"
              />
              <ParameterCard
                title="紧急制动 BCP0_for_code"
                value={
                  typeof emergencyCalibrationBcp0ForCode === "number"
                    ? `${emergencyCalibrationBcp0ForCode} kPa`
                    : "-"
                }
                note="来自 report.controller_code_params.pressure_conversion。"
              />
            </div>
            <div style={{ color: "#6b6259", fontSize: "13px", marginTop: "-4px" }}>
              原始值保留（来自 report.calibration_summary）
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {renderSegmentLines("service_brake", serviceSummary)}
              {renderSegmentLines("emergency_brake", emergencySummary)}
            </div>
            {controllerType === "car" ? (
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
            ) : null}
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            <h3 style={{ margin: 0 }}>标定摘要</h3>
            <InfoSummary
              title="后端标定曲线"
              body="当前页面展示同一坐标轴下的 service_brake 与 emergency_brake 分段曲线。"
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {renderCurveChart("service_brake", serviceSummary, sharedDomain)}
              {renderCurveChart("emergency_brake", emergencySummary, sharedDomain)}
            </div>
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
            note="按每车结果的平均值展示。"
          />
          <ParameterCard
            title="F_PB 每车停放制动力"
            value={`${formatFixed(parkingPerCarForce)} kN`}
            note="按每车结果的平均值展示。"
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
