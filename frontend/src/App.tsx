import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import { importYaml, loadConfig, saveConfig } from "./api/configClient";
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
import type { ImportYamlResult, LoadConfigResult, SupplementPresence } from "./contracts/config";
import type { Report } from "./contracts/report";
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

const mockReport: Report = {
  parking_brake_check_result: {
    per_car: {
      car_1: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 5.0, safety_margin: 3.0 },
      car_2: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 5.0, safety_margin: 3.0 },
      car_3: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 5.0, safety_margin: 3.0 },
      car_4: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 5.0, safety_margin: 3.0 }
    },
    whole_train: { F_PB: 60.0, incline_force: 20.0, safety_margin: 3.0 },
    pass: true
  },
  parking_brake_check_results_by_load_group: {
    AW0: {
      per_car: {
        car_1: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 5.0, safety_margin: 3.0 },
        car_2: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 5.0, safety_margin: 3.0 },
        car_3: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 5.0, safety_margin: 3.0 },
        car_4: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 5.0, safety_margin: 3.0 }
      },
      whole_train: { F_PB: 60.0, incline_force: 20.0, safety_margin: 3.0 },
      pass: true
    },
    AW3: {
      per_car: {
        car_1: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 9.0, safety_margin: 1.67 },
        car_2: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 9.0, safety_margin: 1.67 },
        car_3: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 9.0, safety_margin: 1.67 },
        car_4: { F_N_PB: 16.39, F_PB: 15.0, incline_force: 9.0, safety_margin: 1.67 }
      },
      whole_train: { F_PB: 60.0, incline_force: 36.0, safety_margin: 1.67 },
      pass: false
    }
  }
};

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

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function toYamlScalar(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return "null";
  }
  return String(value);
}

function serializeYaml(value: unknown, indent = 0): string[] {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${pad}[]`];
    }
    return value.flatMap((item) => {
      if (typeof item === "object" && item !== null) {
        const child = serializeYaml(item, indent + 2);
        const [first, ...rest] = child;
        return [`${pad}- ${first.trimStart()}`, ...rest];
      }
      return [`${pad}- ${toYamlScalar(item)}`];
    });
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, entryValue]) => entryValue !== undefined
    );
    if (entries.length === 0) {
      return [`${pad}{}`];
    }
    return entries.flatMap(([key, entryValue]) => {
      if (typeof entryValue === "object" && entryValue !== null) {
        return [`${pad}${key}:`, ...serializeYaml(entryValue, indent + 2)];
      }
      return [`${pad}${key}: ${toYamlScalar(entryValue)}`];
    });
  }
  return [`${pad}${toYamlScalar(value)}`];
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
  const [overviewData, setOverviewData] = useState<LoadConfigResult | null>(null);
  const [activeInputConfigId, setActiveInputConfigId] = useState<string | null>(null);
  const [importProjectName, setImportProjectName] = useState("");
  const [importProjectCode, setImportProjectCode] = useState("");
  const [importYamlText, setImportYamlText] = useState("schema_version: 1\nv0: 80\n");
  const [importResult, setImportResult] = useState<ImportYamlResult | null>(null);
  const [hasImportedConfig, setHasImportedConfig] = useState(false);
  const [hasUnsavedWorkbenchChanges, setHasUnsavedWorkbenchChanges] = useState(false);
  const [importSubmitError, setImportSubmitError] = useState<string | null>(null);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [yamlSupplementPresence, setYamlSupplementPresence] = useState<SupplementPresence>({
    hasParkingBrakeCheck: false,
    hasPressureCalibration: false,
    hasElectricBrake: false,
  });

  const applyImportedVehicleConfig = (formState: Record<string, unknown> | null): void => {
    if (formState === null) {
      return;
    }
    const controllerType = formState.controller_type;
    if (controllerType === "car" || controllerType === "bogie") {
      setControllerConfigType(controllerType);
    }
    const vehicleConfig = toRecord(formState.vehicle_config);
    if (vehicleConfig === null) {
      return;
    }
    const cars = Array.isArray(vehicleConfig.cars) ? vehicleConfig.cars : null;
    const bogies = Array.isArray(vehicleConfig.bogies) ? vehicleConfig.bogies : null;
    if (controllerType !== "car" && controllerType !== "bogie") {
      if (bogies !== null && bogies.length > 0) {
        setControllerConfigType("bogie");
      } else if (cars !== null && cars.length > 0) {
        setControllerConfigType("car");
      }
    }
    if (cars !== null) {
      const rows = cars
        .map((item) => toRecord(item))
        .filter((item) => item !== null)
        .map((item) => ({
          name: String(item.name ?? ""),
          type:
            item.car_type === "powered_car" || item.car_type === "trailer_car"
              ? item.car_type
              : null,
        }))
        .filter((item): item is CarControllerRow => item.type !== null);
      if (rows.length > 0) {
        setCarControllerRows(rows);
      }
    }
    if (bogies !== null) {
      const rows = bogies
        .map((item) => toRecord(item))
        .filter((item) => item !== null)
        .map((item) => ({
          name: String(item.name ?? ""),
          type:
            item.bogie_type === "powered_bogie" || item.bogie_type === "trailer_bogie"
              ? item.bogie_type
              : null,
        }))
        .filter((item): item is BogieControllerRow => item.type !== null);
      if (rows.length > 0) {
        setBogieControllerRows(rows);
      }
    }
  };
  const currentScreen = screens.find((screen) => screen.key === activeScreen) ?? screens[0];

  const parseEnabledFromYaml = (yamlText: string, sectionName: string): boolean | null => {
    const lines = yamlText.split(/\r?\n/);
    let inSection = false;
    let sectionIndent = 0;
    for (const line of lines) {
      const sectionMatch = line.match(/^(\s*)([A-Za-z0-9_]+)\s*:\s*$/);
      if (sectionMatch !== null) {
        const indent = sectionMatch[1].length;
        const key = sectionMatch[2];
        if (key === sectionName) {
          inSection = true;
          sectionIndent = indent;
          continue;
        }
        if (inSection && indent <= sectionIndent) {
          return null;
        }
      }
      if (!inSection) {
        continue;
      }
      if (line.trim().length === 0) {
        continue;
      }
      const enabledMatch = line.match(/^\s*enabled\s*:\s*(true|false)\s*$/i);
      if (enabledMatch !== null) {
        return enabledMatch[1].toLowerCase() === "true";
      }
      if (/^\S/.test(line) || line.match(/^(\s*)[A-Za-z0-9_]+\s*:\s*$/)?.[1].length === sectionIndent) {
        return null;
      }
    }
    return null;
  };

  const deriveSupplementPresenceFromYaml = (yamlText: string): SupplementPresence => ({
    hasParkingBrakeCheck: parseEnabledFromYaml(yamlText, "parking_brake_check") ?? false,
    hasPressureCalibration: parseEnabledFromYaml(yamlText, "pressure_calibration") ?? false,
    hasElectricBrake: parseEnabledFromYaml(yamlText, "electric_brake") ?? false,
  });

  const deriveSupplementPresence = (formState: Record<string, unknown> | null): SupplementPresence => {
    const parking =
      typeof formState?.parking_brake_check === "object" &&
      formState?.parking_brake_check !== null &&
      typeof (formState.parking_brake_check as { enabled?: unknown }).enabled === "boolean" &&
      (formState.parking_brake_check as { enabled: boolean }).enabled;
    const calibration =
      typeof formState?.pressure_calibration === "object" &&
      formState?.pressure_calibration !== null &&
      typeof (formState.pressure_calibration as { enabled?: unknown }).enabled === "boolean" &&
      (formState.pressure_calibration as { enabled: boolean }).enabled;
    const electric =
      typeof formState?.electric_brake === "object" &&
      formState?.electric_brake !== null &&
      typeof (formState.electric_brake as { enabled?: unknown }).enabled === "boolean" &&
      (formState.electric_brake as { enabled: boolean }).enabled;
    return {
      hasParkingBrakeCheck: parking,
      hasPressureCalibration: calibration,
      hasElectricBrake: electric,
    };
  };

  const handleSaveAndViewOverviewFromImportSummary = async (): Promise<void> => {
    setIsImportSubmitting(true);
    setImportSubmitError(null);
    try {
      const now = new Date().toISOString();
      const imported = await importYaml(importYamlText);
      setImportResult(imported);
      if (imported.form_state === null) {
        setImportSubmitError("导入失败：后端未返回可回填的 form_state，请检查 YAML 或后端服务状态。");
        return;
      }
      const saved = await saveConfig({
        project: {
          project_name: importProjectName,
          project_code: importProjectCode,
          email: null,
          note: "",
        },
        yaml_text: importYamlText,
        form_state: imported.form_state ?? {},
        validation_status: imported.valid ? "valid" : "invalid",
        errors: imported.errors,
        created_at: now,
      });
      setActiveInputConfigId(saved.input_config_id);
      const loaded = await loadConfig(saved.input_config_id);
      setOverviewData(loaded);
      applyImportedVehicleConfig(loaded.form_state);
      setHasImportedConfig(true);
      setActiveScreen("overview");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown_error";
      setImportSubmitError(`保存失败：${detail}`);
    } finally {
      setIsImportSubmitting(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    if (activeScreen !== "overview" || activeInputConfigId === null) {
      return () => {
        isCancelled = true;
      };
    }

    loadConfig(activeInputConfigId)
      .then((result) => {
        if (!isCancelled) {
          setOverviewData(result);
          applyImportedVehicleConfig(result.form_state);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setOverviewData(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeScreen, activeInputConfigId]);

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
    setHasImportedConfig(false);
    setHasUnsavedWorkbenchChanges(false);
    setActiveScreen("workbench");
  };

  const handleOpenWorkbenchSectionFromOverview = (section: WorkbenchSectionKey): void => {
    setActiveWorkbenchSection(section);
    setHasImportedConfig(true);
    setHasUnsavedWorkbenchChanges(false);
    setActiveScreen("workbench");
  };

  const navigateToScreen = (screen: ScreenKey): void => {
    if (screen === activeScreen) {
      return;
    }
    if (activeScreen === "workbench" && hasUnsavedWorkbenchChanges) {
      const shouldLeave = window.confirm("当前有未保存改动，确认离开吗？");
      if (!shouldLeave) {
        return;
      }
      setHasUnsavedWorkbenchChanges(false);
    }
    setActiveScreen(screen);
  };

  const pageContent = (() => {
    if (activeScreen === "home") {
      return (
        <HomePage
          onCreateProject={() => setActiveScreen("wizard")}
          onOpenProject={() => setActiveScreen("overview")}
          onImportYamlFile={(yamlText) => {
            setImportYamlText(yamlText);
            setYamlSupplementPresence(deriveSupplementPresenceFromYaml(yamlText));
            setImportSubmitError(null);
            importYaml(yamlText)
              .then((result) => setImportResult(result))
              .catch(() => setImportResult(null));
            setActiveScreen("import-summary");
          }}
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
      return (
        <OverviewPage
          onViewResult={() => setActiveScreen("result")}
          onRevise={() => handleOpenWorkbenchSectionFromOverview("requirements")}
          onSupplementParking={() => handleOpenWorkbenchSectionFromOverview("parking")}
          onSupplementCalibration={() => handleOpenWorkbenchSectionFromOverview("calibration")}
          overviewData={overviewData}
        />
      );
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
          onBackToOverview={() => navigateToScreen("overview")}
          onDirtyChange={setHasUnsavedWorkbenchChanges}
          onSaveDraft={(draft) => {
            const yamlLines = serializeYaml(draft);
            setImportYamlText(`${yamlLines.join("\n")}\n`);
            setOverviewData((current) =>
              current === null
                ? current
                : {
                    ...current,
                    form_state: draft,
                    yaml_text: `${yamlLines.join("\n")}\n`,
                  }
            );
          }}
          importedYamlText={importYamlText}
          importedFormState={overviewData?.form_state ?? importResult?.form_state ?? null}
          importedErrors={overviewData?.errors ?? importResult?.errors ?? []}
          hasImportedConfig={hasImportedConfig}
        />
      );
    }

    if (activeScreen === "result") {
      return (
        <ResultPage
          report={mockReport}
          requiredSafetyMargin={2.0}
          pressureMatrixView={pressureMatrixView}
          onChangePressureMatrixView={setPressureMatrixView}
          onBackToOverview={() => setActiveScreen("overview")}
        />
      );
    }

    if (activeScreen === "import-summary") {
      return (
        <ImportSummaryPage
          onSaveAndViewOverview={handleSaveAndViewOverviewFromImportSummary}
          onViewOverview={() => setActiveScreen("overview")}
          projectName={importProjectName}
          projectCode={importProjectCode}
          onChangeProjectName={setImportProjectName}
          onChangeProjectCode={setImportProjectCode}
          yamlText={importYamlText}
          onChangeYamlText={(yamlText) => {
            setImportYamlText(yamlText);
            setYamlSupplementPresence(deriveSupplementPresenceFromYaml(yamlText));
            setImportSubmitError(null);
          }}
          importValid={importResult?.valid ?? null}
          importErrors={importResult?.errors ?? []}
          supplementPresence={
            importResult?.form_state !== null && importResult?.form_state !== undefined
              ? deriveSupplementPresence(importResult.form_state)
              : yamlSupplementPresence
          }
          submitError={importSubmitError}
          isSubmitting={isImportSubmitting}
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
            const isDisabled = screen.key === "wizard" && hasImportedConfig;

            return (
              <button
                key={screen.key}
                type="button"
                onClick={() => navigateToScreen(screen.key)}
                style={isActive ? primaryActionStyle : inactiveTabStyle}
                disabled={isDisabled}
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
