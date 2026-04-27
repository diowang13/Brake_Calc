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
import {
  FieldBlock,
  InfoCard
} from "./components/ui";
import { HomePage } from "./pages/HomePage";
import { ImportSummaryPage } from "./pages/ImportSummaryPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ResultPage } from "./pages/ResultPage";
import { WorkbenchPage, type WorkbenchSectionKey } from "./pages/WorkbenchPage";
import { WizardPage } from "./pages/WizardPage";

export function App(): ReactElement {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("home");
  const [loadInputMode, setLoadInputMode] = useState<"car" | "bogie">("car");
  const [airSpringMassUnit, setAirSpringMassUnit] = useState<"ton" | "kn">("ton");
  const [airSpringInputMode, setAirSpringInputMode] = useState<"fitted_from_points" | "explicit_linear">(
    "fitted_from_points"
  );
  const [pressureMatrixView, setPressureMatrixView] = useState<"load" | "controller">("load");
  const [activeWorkbenchSection, setActiveWorkbenchSection] =
    useState<WorkbenchSectionKey>("load-air-spring");
  const currentScreen = screens.find((screen) => screen.key === activeScreen) ?? screens[0];

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
      return <WizardPage onEnterWorkbench={() => setActiveScreen("workbench")} />;
    }

    if (activeScreen === "overview") {
      return <OverviewPage onViewResult={() => setActiveScreen("result")} />;
    }

    if (activeScreen === "workbench") {
      return (
        <WorkbenchPage
          loadInputMode={loadInputMode}
          airSpringMassUnit={airSpringMassUnit}
          airSpringInputMode={airSpringInputMode}
          activeSection={activeWorkbenchSection}
          onChangeLoadInputMode={setLoadInputMode}
          onChangeAirSpringMassUnit={setAirSpringMassUnit}
          onChangeAirSpringInputMode={setAirSpringInputMode}
          onChangeSection={setActiveWorkbenchSection}
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
