import type { ReactElement } from "react";
import { useState } from "react";

import {
  ghostActionStyle,
  headerPanelStyle,
  inactiveTabStyle,
  pagePanelStyle,
  panelStyle,
  primaryActionStyle,
  secondaryActionStyle,
  shellInnerStyle,
  shellStyle
} from "./app/styles";
import { screens, type ScreenKey } from "./app/screens";
import { HomePage } from "./pages/HomePage";
import { ImportSummaryPage } from "./pages/ImportSummaryPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ResultPage } from "./pages/ResultPage";
import {
  WorkbenchPage,
  type BogieControllerRow,
  type CarControllerRow,
  type WorkbenchSectionKey
} from "./pages/WorkbenchPage";
import { WizardPage } from "./pages/WizardPage";

function parseCount(value: string, fallback: number): number {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

function generateCarRows(poweredCount: number, trailerCount: number): CarControllerRow[] {
  const trailerRows = Array.from({ length: trailerCount }, (_, index) => ({
    name: `trailer_car_${index + 1}`,
    type: "trailer_car" as const
  }));
  const poweredRows = Array.from({ length: poweredCount }, (_, index) => {
    const controllerIndex = trailerCount + index + 1;
    return {
      name: `powered_car_${controllerIndex}`,
      type: "powered_car" as const
    };
  });

  return [...trailerRows, ...poweredRows];
}

function generateBogieRows(poweredCarCount: number, trailerCarCount: number): BogieControllerRow[] {
  const trailerRows = Array.from({ length: trailerCarCount * 2 }, (_, index) => ({
    name: `trailer_bogie_${index + 1}`,
    type: "trailer_bogie" as const
  }));
  const poweredRows = Array.from({ length: poweredCarCount * 2 }, (_, index) => {
    const controllerIndex = trailerRows.length + index + 1;
    return {
      name: `powered_bogie_${controllerIndex}`,
      type: "powered_bogie" as const
    };
  });

  return [...trailerRows, ...poweredRows];
}

function generateMixedBogieRows(
  mixedCarCount: number,
  poweredCarCount: number,
  trailerCarCount: number
): BogieControllerRow[] {
  const rows: BogieControllerRow[] = [];
  let controllerIndex = 1;

  Array.from({ length: mixedCarCount }).forEach(() => {
    rows.push({
      name: `trailer_bogie_${controllerIndex}`,
      type: "trailer_bogie"
    });
    controllerIndex += 1;
    rows.push({
      name: `powered_bogie_${controllerIndex}`,
      type: "powered_bogie"
    });
    controllerIndex += 1;
  });

  Array.from({ length: trailerCarCount * 2 }).forEach(() => {
    rows.push({
      name: `trailer_bogie_${controllerIndex}`,
      type: "trailer_bogie"
    });
    controllerIndex += 1;
  });

  Array.from({ length: poweredCarCount * 2 }).forEach(() => {
    rows.push({
      name: `powered_bogie_${controllerIndex}`,
      type: "powered_bogie"
    });
    controllerIndex += 1;
  });

  return rows;
}

function getDefaultCarRows(): CarControllerRow[] {
  return [
    {
      name: "trailer_car_1",
      type: "trailer_car" as const
    },
    {
      name: "powered_car_2",
      type: "powered_car" as const
    }
  ];
}

function getDefaultBogieRows(): BogieControllerRow[] {
  return [
    {
      name: "trailer_bogie_1",
      type: "trailer_bogie" as const
    },
    {
      name: "trailer_bogie_2",
      type: "trailer_bogie" as const
    },
    {
      name: "powered_bogie_3",
      type: "powered_bogie" as const
    },
    {
      name: "powered_bogie_4",
      type: "powered_bogie" as const
    }
  ];
}

export function App(): ReactElement {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("home");
  const [loadInputMode, setLoadInputMode] = useState<"car" | "bogie">("car");
  const [controllerConfigType, setControllerConfigType] = useState<"car" | "bogie">("car");
  const [totalCars, setTotalCars] = useState("2");
  const [poweredCars, setPoweredCars] = useState("1");
  const [trailerCars, setTrailerCars] = useState("1");
  const [mixedCars, setMixedCars] = useState("0");
  const [hasMixedBogieVehicles, setHasMixedBogieVehicles] = useState(false);
  const [showInitializerResetHint, setShowInitializerResetHint] = useState(false);
  const [targetPoweredCount, setTargetPoweredCount] = useState(1);
  const [targetTrailerCount, setTargetTrailerCount] = useState(1);
  const [targetMixedCount, setTargetMixedCount] = useState(0);
  const [carControllerRows, setCarControllerRows] = useState<CarControllerRow[]>(getDefaultCarRows);
  const [bogieControllerRows, setBogieControllerRows] =
    useState<BogieControllerRow[]>(getDefaultBogieRows);
  const [airSpringMassUnit, setAirSpringMassUnit] = useState<"ton" | "kn">("ton");
  const [emergencyRequirementMode, setEmergencyRequirementMode] = useState<"a_mean" | "distance">(
    "a_mean"
  );
  const [fastBrakeEnabled, setFastBrakeEnabled] = useState(false);
  const [baseBrakeCylinderType, setBaseBrakeCylinderType] = useState<"tread_cylinder" | "caliper_cylinder">(
    "tread_cylinder"
  );
  const [airSpringInputMode, setAirSpringInputMode] = useState<"fitted_from_points" | "explicit_linear">(
    "fitted_from_points"
  );
  const [pressureMatrixView, setPressureMatrixView] = useState<"load" | "controller">("load");
  const [activeWorkbenchSection, setActiveWorkbenchSection] =
    useState<WorkbenchSectionKey>("load-air-spring");
  const currentScreen = screens.find((screen) => screen.key === activeScreen) ?? screens[0];

  const clearInitializerCounts = (): void => {
    setTotalCars("0");
    setPoweredCars("0");
    setTrailerCars("0");
    setMixedCars("0");
  };

  const updateInitializerCount =
    (setter: (value: string) => void) =>
    (value: string): void => {
      setter(value);
      setShowInitializerResetHint(false);
    };

  const handleChangeBcuType = (type: "car" | "bogie"): void => {
    if (type === "car" && hasMixedBogieVehicles) {
      setHasMixedBogieVehicles(false);
      clearInitializerCounts();
      setShowInitializerResetHint(true);
    }

    setControllerConfigType(type);
  };

  const handleToggleMixedBogieVehicles = (checked: boolean): void => {
    setHasMixedBogieVehicles(checked);
    clearInitializerCounts();
    setShowInitializerResetHint(true);
  };

  const handleEnterWorkbenchFromWizard = (): void => {
    const nextPoweredCount = parseCount(poweredCars, 1);
    const nextTrailerCount = parseCount(trailerCars, 1);
    const nextMixedCount = parseCount(mixedCars, 0);

    setTargetPoweredCount(nextPoweredCount);
    setTargetTrailerCount(nextTrailerCount);
    setTargetMixedCount(controllerConfigType === "bogie" && hasMixedBogieVehicles ? nextMixedCount : 0);
    setCarControllerRows(generateCarRows(nextPoweredCount, nextTrailerCount));
    setBogieControllerRows(
      controllerConfigType === "bogie" && hasMixedBogieVehicles
        ? generateMixedBogieRows(nextMixedCount, nextPoweredCount, nextTrailerCount)
        : generateBogieRows(nextPoweredCount, nextTrailerCount)
    );
    setActiveWorkbenchSection("requirements");
    setActiveScreen("workbench");
  };

  const pageContent = (() => {
    if (activeScreen === "home") {
      return (
        <HomePage
          onCreateProject={() => setActiveScreen("wizard")}
          onOpenProject={() => setActiveScreen("overview")}
        />
      );
    }

    if (activeScreen === "wizard") {
      return (
        <WizardPage
          bcuType={controllerConfigType}
          hasMixedBogieVehicles={hasMixedBogieVehicles}
          mixedCars={mixedCars}
          showResetHint={showInitializerResetHint}
          totalCars={totalCars}
          poweredCars={poweredCars}
          trailerCars={trailerCars}
          onChangeBcuType={handleChangeBcuType}
          onChangeHasMixedBogieVehicles={handleToggleMixedBogieVehicles}
          onChangeTotalCars={updateInitializerCount(setTotalCars)}
          onChangeMixedCars={updateInitializerCount(setMixedCars)}
          onChangePoweredCars={updateInitializerCount(setPoweredCars)}
          onChangeTrailerCars={updateInitializerCount(setTrailerCars)}
          onEnterWorkbench={handleEnterWorkbenchFromWizard}
        />
      );
    }

    if (activeScreen === "overview") {
      return <OverviewPage onViewResult={() => setActiveScreen("result")} />;
    }

    if (activeScreen === "workbench") {
      return (
        <WorkbenchPage
          loadInputMode={loadInputMode}
          controllerConfigType={controllerConfigType}
          airSpringMassUnit={airSpringMassUnit}
          airSpringInputMode={airSpringInputMode}
          baseBrakeCylinderType={baseBrakeCylinderType}
          emergencyRequirementMode={emergencyRequirementMode}
          fastBrakeEnabled={fastBrakeEnabled}
          activeSection={activeWorkbenchSection}
          targetPoweredCount={targetPoweredCount}
          targetTrailerCount={targetTrailerCount}
          targetMixedCount={targetMixedCount}
          hasMixedBogieVehicles={hasMixedBogieVehicles}
          carControllerRows={carControllerRows}
          bogieControllerRows={bogieControllerRows}
          onChangeLoadInputMode={setLoadInputMode}
          onChangeAirSpringMassUnit={setAirSpringMassUnit}
          onChangeAirSpringInputMode={setAirSpringInputMode}
          onChangeBaseBrakeCylinderType={setBaseBrakeCylinderType}
          onChangeEmergencyRequirementMode={setEmergencyRequirementMode}
          onChangeFastBrakeEnabled={setFastBrakeEnabled}
          onChangeSection={setActiveWorkbenchSection}
          onChangeCarControllerRows={setCarControllerRows}
          onChangeBogieControllerRows={setBogieControllerRows}
          onBackToOverview={() => setActiveScreen("overview")}
        />
      );
    }

    if (activeScreen === "result") {
      return (
        <ResultPage
          pressureMatrixView={pressureMatrixView}
          onChangePressureMatrixView={setPressureMatrixView}
          onBackToOverview={() => setActiveScreen("overview")}
        />
      );
    }

    if (activeScreen === "import-summary") {
      return (
        <ImportSummaryPage
          onEnterWorkbench={() => setActiveScreen("workbench")}
          onViewOverview={() => setActiveScreen("overview")}
        />
      );
    }

    return (
      <>
        <h2 style={{ marginTop: 0, fontSize: "32px" }}>{currentScreen.heading}</h2>
        <p style={{ margin: "0 0 20px", color: "#6b6259", lineHeight: 1.6 }}>
          {currentScreen.description}
        </p>
        <div
          style={{
            border: "1px dashed #c8b9a7",
            borderRadius: "16px",
            background: "#f8f2eb",
            padding: "18px",
            color: "#6b6259"
          }}
        >
          当前页面壳已接入 React。下一步会按实施计划逐页替换为正式页面内容。
        </div>
      </>
    );
  })();

  return (
    <main style={shellStyle}>
      <div style={shellInnerStyle}>
        <section style={headerPanelStyle}>
          <h1 style={{ margin: "0 0 8px", fontSize: "24px" }}>brake-calc 前端应用壳</h1>
          <p style={{ margin: 0, color: "#6b6259" }}>
            第一阶段先让 5 个核心页面的真实 React 壳跑起来，再逐步替换为正式页面实现。
          </p>
        </section>

        <nav
          aria-label="核心页面切换"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          {screens.map((screen) => {
            const isActive = screen.key === activeScreen;

            return (
              <button
                key={screen.key}
                type="button"
                onClick={() => setActiveScreen(screen.key)}
                style={isActive ? primaryActionStyle : inactiveTabStyle}
              >
                {screen.label}
              </button>
            );
          })}
        </nav>

        <section style={pagePanelStyle}>{pageContent}</section>
      </div>
    </main>
  );
}
