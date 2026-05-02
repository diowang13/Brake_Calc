import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import {
  downloadYaml,
  importYaml,
  listProjects,
  loadConfig,
  openProject,
  runConfig,
  saveConfig,
} from "./api/configClient";
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
import type { ProjectListItem } from "./contracts/config";
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

const emptyReport: Report = {
  parking_brake_check_result: null,
  parking_brake_check_results_by_load_group: {},
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
  const [wizardProjectName, setWizardProjectName] = useState("");
  const [wizardProjectCode, setWizardProjectCode] = useState("");
  const [wizardProjectEmail, setWizardProjectEmail] = useState("");
  const [wizardProjectNote, setWizardProjectNote] = useState("");
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
  const [yamlChangedLineIndexes, setYamlChangedLineIndexes] = useState<number[]>([]);
  const [yamlChangedPaths, setYamlChangedPaths] = useState<string[]>([]);
  const [runtimeReport, setRuntimeReport] = useState<Report>(emptyReport);
  const [runtimeFormState, setRuntimeFormState] = useState<Record<string, unknown> | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<"idle" | "succeeded" | "failed">("idle");
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [requireReloadForWorkbench, setRequireReloadForWorkbench] = useState(false);

  useEffect(() => {
    listProjects()
      .then((result) => {
        setProjects(result.items);
      })
      .catch(() => {
        setProjects([]);
      });
  }, []);

  const hydrateRuntimeFromLoadedConfig = (loaded: LoadConfigResult): void => {
    if (loaded.latest_run?.status === "succeeded" && loaded.latest_run.report !== null) {
      setRuntimeStatus("succeeded");
      setRuntimeReport(loaded.latest_run.report as Report);
      setRuntimeFormState(loaded.form_state);
      return;
    }
    if (loaded.latest_run?.status === "failed") {
      setRuntimeStatus("failed");
      return;
    }
    setRuntimeStatus((current) => (current === "succeeded" ? current : "idle"));
  };

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

  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const collectChangedScalarPaths = (
    previousValue: unknown,
    nextValue: unknown,
    basePath = ""
  ): string[] => {
    if (Array.isArray(previousValue) || Array.isArray(nextValue)) {
      return previousValue === nextValue ? [] : [basePath];
    }
    if (isPlainObject(previousValue) && isPlainObject(nextValue)) {
      const keys = new Set([...Object.keys(previousValue), ...Object.keys(nextValue)]);
      const changed: string[] = [];
      keys.forEach((key) => {
        const childPath = basePath.length > 0 ? `${basePath}.${key}` : key;
        changed.push(
          ...collectChangedScalarPaths(previousValue[key], nextValue[key], childPath)
        );
      });
      return changed;
    }
    return previousValue !== nextValue && basePath.length > 0 ? [basePath] : [];
  };

  const findYamlChangedLineIndexesByPaths = (yamlText: string, changedPaths: string[]): number[] => {
    const changedSet = new Set(changedPaths);
    const lines = yamlText.split(/\r?\n/);
    const stack: Array<{ indent: number; key: string }> = [];
    const indexes: number[] = [];
    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (match === null) {
        return;
      }
      const indent = match[1].length;
      const key = match[2];
      const valuePortion = match[3];
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const path = [...stack.map((item) => item.key), key].join(".");
      const isContainer = valuePortion.length === 0;
      if (!isContainer && changedSet.has(path)) {
        indexes.push(index);
      }
      if (isContainer) {
        stack.push({ indent, key });
      }
    });
    return indexes;
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
      hydrateRuntimeFromLoadedConfig(loaded);
      setHasImportedConfig(true);
      setRequireReloadForWorkbench(false);
      setActiveScreen("overview");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown_error";
      setImportSubmitError(`保存失败：${detail}`);
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const handleRunDraft = async (draft: Record<string, unknown>): Promise<void> => {
    const previousFormState = (overviewData?.form_state ?? importResult?.form_state ?? {}) as Record<
      string,
      unknown
    >;
    const yamlLines = serializeYaml(draft);
    const afterYaml = `${yamlLines.join("\n")}\n`;
    const changedPaths = collectChangedScalarPaths(previousFormState, draft);
    setImportYamlText(afterYaml);
    setYamlChangedPaths(changedPaths);
    setYamlChangedLineIndexes(findYamlChangedLineIndexesByPaths(afterYaml, changedPaths));
    setOverviewData((current) =>
      current === null
        ? current
        : {
            ...current,
            form_state: draft,
            yaml_text: afterYaml,
          }
    );

    if (activeInputConfigId === null) {
      window.alert("当前没有可运行的已保存配置，请先导入并保存配置。");
      return;
    }

    try {
      const now = new Date().toISOString();
      const project = (() => {
        if (overviewData?.project !== undefined) {
          return overviewData.project;
        }
        const wizardCode = wizardProjectCode.trim();
        const wizardName = wizardProjectName.trim();
        if (wizardCode.length > 0 || wizardName.length > 0) {
          return {
            project_name: wizardName.length > 0 ? wizardName : "未命名项目",
            project_code: wizardCode.length > 0 ? wizardCode : `UNSET-${Date.now()}`,
            email: wizardProjectEmail.trim().length > 0 ? wizardProjectEmail.trim() : null,
            note: wizardProjectNote,
          };
        }
        return {
          project_name: importProjectName,
          project_code: importProjectCode,
          email: null,
          note: "",
        };
      })();
      const saved = await saveConfig({
        project,
        yaml_text: afterYaml,
        form_state: draft,
        validation_status: "valid",
        errors: [],
        created_at: now,
        source_input_config_id: activeInputConfigId,
        revision_reason: "run_from_workbench",
      });
      setActiveInputConfigId(saved.input_config_id);
      const runResult = await runConfig(saved.input_config_id);
      setRuntimeReport(runResult.report as Report);
      setRuntimeFormState(draft);
      setRuntimeStatus("succeeded");
      setHasUnsavedWorkbenchChanges(false);
      setOverviewData((current) => (current === null ? current : { ...current }));
      setActiveScreen("result");
    } catch (error) {
      setRuntimeStatus("failed");
      const detail = error instanceof Error ? error.message : "unknown_error";
      window.alert(`运行失败：${detail}`);
    }
  };

  const handleSaveDraft = async (draft: Record<string, unknown>): Promise<void> => {
    const previousFormState = (overviewData?.form_state ?? importResult?.form_state ?? {}) as Record<
      string,
      unknown
    >;
    const yamlLines = serializeYaml(draft);
    const afterYaml = `${yamlLines.join("\n")}\n`;
    const changedPaths = collectChangedScalarPaths(previousFormState, draft);
    setImportYamlText(afterYaml);
    setYamlChangedPaths(changedPaths);
    setYamlChangedLineIndexes(findYamlChangedLineIndexesByPaths(afterYaml, changedPaths));
    try {
      const now = new Date().toISOString();
      const project = (() => {
        if (overviewData?.project !== undefined) {
          return overviewData.project;
        }
        const wizardCode = wizardProjectCode.trim();
        const wizardName = wizardProjectName.trim();
        if (wizardCode.length > 0 || wizardName.length > 0) {
          return {
            project_name: wizardName.length > 0 ? wizardName : "未命名项目",
            project_code: wizardCode.length > 0 ? wizardCode : `UNSET-${Date.now()}`,
            email: wizardProjectEmail.trim().length > 0 ? wizardProjectEmail.trim() : null,
            note: wizardProjectNote,
          };
        }
        return {
          project_name: importProjectName,
          project_code: importProjectCode,
          email: null,
          note: "",
        };
      })();
      const payload: SaveConfigRequestPayload = {
        project,
        yaml_text: afterYaml,
        form_state: draft,
        validation_status: "valid",
        errors: [],
        created_at: now,
      };
      if (activeInputConfigId !== null) {
        payload.source_input_config_id = activeInputConfigId;
        payload.revision_reason = "save_from_workbench";
      }
      const saved = await saveConfig(payload);
      setActiveInputConfigId(saved.input_config_id);
      const loaded = await loadConfig(saved.input_config_id);
      setOverviewData(loaded);
      setHasUnsavedWorkbenchChanges(false);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown_error";
      window.alert(`保存失败：${detail}`);
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
          hydrateRuntimeFromLoadedConfig(result);
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
    setRequireReloadForWorkbench(false);
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
    if (screen === "workbench" && activeScreen === "home" && requireReloadForWorkbench) {
      window.alert("请先在首页打开既有项目（加载已保存配置），再从总览“修订”进入工作台。");
      return;
    }
    if (activeScreen === "workbench" && hasUnsavedWorkbenchChanges) {
      const shouldLeave = window.confirm("当前有未保存改动，确认离开吗？");
      if (!shouldLeave) {
        return;
      }
      setHasUnsavedWorkbenchChanges(false);
    }
    if (activeScreen === "workbench" && screen === "home") {
      setRequireReloadForWorkbench(true);
    }
    setActiveScreen(screen);
  };

  const pageContent = (() => {
    if (activeScreen === "home") {
      return (
        <HomePage
          onCreateProject={() => setActiveScreen("wizard")}
          onOpenProject={(projectCode) => {
            openProject(projectCode)
              .then((result) => {
                setActiveInputConfigId(result.input_config_id);
                setOverviewData(result.config);
                setImportProjectName(result.config.project.project_name);
                setImportProjectCode(result.config.project.project_code);
                applyImportedVehicleConfig(result.config.form_state);
                hydrateRuntimeFromLoadedConfig(result.config);
                setHasImportedConfig(true);
                setRequireReloadForWorkbench(false);
                setActiveScreen("overview");
              })
              .catch((error) => {
                const detail = error instanceof Error ? error.message : "unknown_error";
                window.alert(`打开项目失败：${detail}`);
              });
          }}
          onImportYamlFile={(yamlText) => {
            setImportYamlText(yamlText);
            setYamlSupplementPresence(deriveSupplementPresenceFromYaml(yamlText));
            setImportSubmitError(null);
            importYaml(yamlText)
              .then((result) => setImportResult(result))
              .catch(() => setImportResult(null));
            setActiveScreen("import-summary");
          }}
          projects={projects}
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
          projectName={wizardProjectName}
          projectCode={wizardProjectCode}
          projectEmail={wizardProjectEmail}
          projectNote={wizardProjectNote}
          onChangeBcuType={handleChangeBcuType}
          onChangeHasMixedBogieVehicles={handleToggleMixedBogieVehicles}
          onChangeTotalCars={updateInitializerCount(setTotalCars)}
          onChangeMixedCars={updateInitializerCount(setMixedCars)}
          onChangePoweredCars={updateInitializerCount(setPoweredCars)}
          onChangeTrailerCars={updateInitializerCount(setTrailerCars)}
          onChangeProjectName={setWizardProjectName}
          onChangeProjectCode={setWizardProjectCode}
          onChangeProjectEmail={setWizardProjectEmail}
          onChangeProjectNote={setWizardProjectNote}
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
          runtimeStatus={runtimeStatus}
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
            void handleSaveDraft(draft);
          }}
          onRunDraft={(draft) => {
            void handleRunDraft(draft);
          }}
          onDownloadYaml={() => {
            if (activeInputConfigId === null) {
              window.alert("当前没有可下载的配置，请先保存配置。");
              return;
            }
            downloadYaml(activeInputConfigId)
              .then((payload) => {
                const blob = new Blob([payload.yaml_text], { type: "text/yaml;charset=utf-8" });
                const objectUrl = window.URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = objectUrl;
                anchor.download = payload.filename;
                document.body.append(anchor);
                anchor.click();
                anchor.remove();
                window.URL.revokeObjectURL(objectUrl);
              })
              .catch((error) => {
                const detail = error instanceof Error ? error.message : "unknown_error";
                window.alert(`下载 YAML 失败：${detail}`);
              });
          }}
          importedYamlText={importYamlText}
          importedFormState={overviewData?.form_state ?? importResult?.form_state ?? null}
          importedErrors={overviewData?.errors ?? importResult?.errors ?? []}
          hasImportedConfig={hasImportedConfig}
          yamlChangedLineIndexes={yamlChangedLineIndexes}
          yamlChangedPaths={yamlChangedPaths}
        />
      );
    }

    if (activeScreen === "result") {
      const runtimeParkingConfig = toRecord(runtimeFormState?.parking_brake_check);
      const runtimeRequiredSafetyMargin =
        typeof runtimeParkingConfig?.required_safety_margin === "number"
          ? runtimeParkingConfig.required_safety_margin
          : 2.0;
      return (
        <ResultPage
          report={runtimeReport}
          requiredSafetyMargin={runtimeRequiredSafetyMargin}
          controllerType={controllerConfigType}
          controllerOrder={
            controllerConfigType === "bogie"
              ? bogieControllerRows.map((item) => item.name)
              : carControllerRows.map((item) => item.name)
          }
          runtimeStatus={runtimeStatus}
          pressureMatrixView={pressureMatrixView}
          onChangePressureMatrixView={setPressureMatrixView}
          onBackToWorkbench={() => setActiveScreen("workbench")}
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
            setYamlChangedLineIndexes([]);
            setYamlChangedPaths([]);
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
                style={
                  isDisabled
                    ? { ...inactiveTabStyle, background: "#ece6de", color: "#9d9388", border: "1px solid #cfc4b8", boxShadow: "none", cursor: "not-allowed" }
                    : isActive
                      ? primaryActionStyle
                      : inactiveTabStyle
                }
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
