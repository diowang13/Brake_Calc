import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { App } from "./App";
import {
  downloadYaml,
  listProjectVersions,
  listProjects,
  loadConfig,
  openProject,
  previewCalibration,
  runConfig,
  saveConfig,
} from "./api/configClient";
import { ResultPage } from "./pages/ResultPage";

vi.mock("./api/configClient", () => {
  let savedConfig: Record<string, unknown> | null = null;
  return {
    importYaml: vi.fn(async (yamlText: string) => {
    const hasMass = yamlText.includes("mass_params:");
    const hasRequirement = yamlText.includes("requirement:");
    const hasAdhesion = yamlText.includes("adhesion:");
    const hasBrakeTypes = yamlText.includes("brake_types:");
    const hasV0 = yamlText.includes("v0:");
    const hasVList = yamlText.includes("V_list:");
    const formState: Record<string, unknown> = {};
    if (hasV0) {
      formState.v0 = 80;
    }
    if (hasVList) {
      formState.V_list = [40, 60, 80];
    }
    if (hasBrakeTypes) {
      formState.brake_types = [
        { name: "FSB", source: "kinematic" },
        { name: "EB", source: "kinematic" },
        { name: "FB", source: "kinematic" },
        { name: "holding", source: "ratio_of_FSB", ratio: 0.5 },
      ];
    }
    if (hasRequirement) {
      formState.requirement = {
        FSB: { mode: "a_mean", value: 1.0 },
        EB: { mode: "distance", value: 205.0 },
      };
      formState.response_time = {
        FSB: { t1: 0.4, impulse_rate: 0.75 },
        EB: { t1: 0.3, t2: 1.2 },
      };
    }
    if (hasAdhesion) {
      formState.adhesion = { mu_limit: 0.15 };
    }
    if (hasMass) {
      formState.mass_params = {
        powered_bogie: { mass_static: { AW0: 15.83, AW3: 26.37 }, bogie_weight: 6.3 },
        trailer_bogie: { mass_static: { AW0: 15.37, AW3: 25.18 }, bogie_weight: 4.1 }
      };
      formState.air_spring = { powered_bogie: { airspring_k: 43.69, airspring_b: 4.13 } };
    }
    if (yamlText.includes("controller_type: bogie")) {
      formState.controller_type = "bogie";
    }
    if (yamlText.includes("controller_type: car")) {
      formState.controller_type = "car";
    }
    if (yamlText.includes("vehicle_config:")) {
      if (yamlText.includes("bogies:")) {
        formState.vehicle_config = yamlText.includes("powered_bogie_6")
          ? {
              bogies: [
                { name: "trailer_bogie_1", bogie_type: "trailer_bogie" },
                { name: "trailer_bogie_2", bogie_type: "trailer_bogie" },
                { name: "powered_bogie_3", bogie_type: "powered_bogie" },
                { name: "powered_bogie_4", bogie_type: "powered_bogie" },
                { name: "powered_bogie_5", bogie_type: "powered_bogie" },
                { name: "powered_bogie_6", bogie_type: "powered_bogie" }
              ]
            }
          : {
              bogies: [
                { name: "trailer_bogie_11", bogie_type: "trailer_bogie" },
                { name: "powered_bogie_12", bogie_type: "powered_bogie" }
              ]
            };
      }
      if (yamlText.includes("cars:")) {
        formState.vehicle_config = {
          cars: [
            { name: "trailer_car_11", car_type: "trailer_car" },
            { name: "powered_car_12", car_type: "powered_car" }
          ]
        };
      }
    }
    if (yamlText.includes("airspring_k:")) {
      formState.air_spring = { powered_bogie: { mode: "explicit_linear", airspring_k: 43.69, airspring_b: 4.13 } };
    }
    if (yamlText.includes("points:")) {
      formState.air_spring = {
        powered_bogie: {
          mode: "fitted_from_points",
          points: [
            { pressure_kpa: 101, sprung_mass_by_spring_ton: 10.1 },
            { pressure_kpa: 202, sprung_mass_by_spring_ton: 20.2 },
            { pressure_kpa: 303, sprung_mass_by_spring_ton: 30.3 }
          ]
        }
      };
    }
    if (yamlText.includes("mech_params:")) {
      formState.mech_params = {
        cylinder_type: yamlText.includes("cylinder_type: caliper_cylinder")
          ? "caliper_cylinder"
          : "tread_cylinder",
        Sc: 0.0248,
        xi: 0.29,
        Li: 3.4,
        eta_i: 0.95,
        Lo: 1.0,
        eta_o: 1.0,
        Fs1: 1.0,
        Fs2: 0.25,
        Dw: 0.84,
        Rf: 0.12,
      };
    }
    if (yamlText.includes("parking_brake_check:")) {
      formState.parking_brake_check = {
        enabled: yamlText.includes("parking_brake_check:\n  enabled: true"),
        required_safety_margin: 1.2,
        static_friction_coefficient: 0.35,
        n_parking_cylinders_by_car: 4,
        environment: {
          wind_speed_max: 34.0,
          wind_resistance_coefficient: 0.0037,
          grade_by_load_group: { AW0: 40, AW2: 30, AW3: 40 },
        },
        cylinder: {
          Fp: 7.4,
          Fs1: 1.0,
          Fs2: 0.25,
          Lpi: 2.04,
          eta_pi: 1.0,
          Lo: 1.0,
          eta_o: 1.0,
        },
      };
    }
    if (yamlText.includes("pressure_calibration:")) {
      formState.pressure_calibration = {
        enabled: yamlText.includes("pressure_calibration:\n  enabled: true"),
        service_brake: {
          BCP0: 25.0,
          point_pair_mode: "aw3_aw0",
          points: [
            { load_group: "AW0", brake_type: "FSB", k_for_code: 1014.0 },
            { load_group: "AW3", brake_type: "FB", k_for_code: 1204.0 },
          ],
        },
      };
    }
    return {
      valid: true,
      errors: [],
      form_state: formState
    };
    }),
    loadConfig: vi.fn(async (inputConfigId: string) => {
      if (savedConfig !== null) {
        return savedConfig;
      }
      if (inputConfigId === "mock-config-id") {
        return {
          project: {
            project_name: "上海机场线制动项目",
            project_code: "SH-HX-026",
            email: null,
            note: "",
          },
          yaml_text: "schema_version: 1\nv0: 80\n",
          form_state: { schema_version: 1, v0: 80 },
          validation_status: "valid",
          errors: [],
          version: 3,
          source_input_config_id: null,
          revision_reason: null,
          latest_run: {
            calculation_run_id: "run-1",
            status: "succeeded",
            report: {
              parking_brake_check_result: null,
              parking_brake_check_results_by_load_group: {},
              theoretical_speed_checks: {},
              load_summary: {},
              controller_pressure_standards: {},
              controller_code_params: { pressure_conversion: {} },
            },
            created_at: "2026-04-30T12:00:00Z",
          },
        };
      }
      return null;
    }),
    saveConfig: vi.fn(async (payload: Record<string, unknown>) => {
      savedConfig = {
        project: payload.project,
        yaml_text: payload.yaml_text,
        form_state: payload.form_state,
        validation_status: payload.validation_status,
        errors: payload.errors ?? [],
        version: 1,
        source_input_config_id: null,
        revision_reason: null,
      };
      return { input_config_id: "mock-config-id" };
    }),
    runConfig: vi.fn(async () => ({
      calculation_run_id: "mock-run-id",
      status: "succeeded",
      report: {
        theoretical_speed_checks: {
          FSB: {
            "40.0": {
              beta_used: 1.111,
              requirement_a_mean: 0.95,
              theoretical_distance_m: 120.0,
            },
          },
          EB: {
            "40.0": {
              beta_used: 1.222,
              requirement_a_mean: 1.05,
              theoretical_distance_m: 100.0,
            },
          },
        },
        load_summary: {
          AW0: {
            trailer_bogie_1: {
              mass_dynamic: 16.14,
              spring_pressure: 250,
            },
          },
        },
        controller_pressure_standards: {
          AW0: {
            FSB: { trailer_bogie_1: 226 },
            FB: { trailer_bogie_1: 124 },
            EB: { trailer_bogie_1: 254 },
          },
        },
        controller_code_params: {
          pressure_conversion: {
            FSB: {
              AW0: {
                trailer_bogie_1: {
                  k_used_for_code: 1077,
                  BCP0_used_for_code: 25,
                },
              },
            },
            EB: {
              AW0: {
                trailer_bogie_1: {
                  k_used_for_code: 1204,
                  BCP0_used_for_code: 30,
                },
              },
            },
          },
        },
        parking_brake_check_result: {
          per_car: {
            car_1: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 5.0, safety_margin: 4.4 },
            car_2: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 5.0, safety_margin: 4.4 },
          },
          whole_train: { F_PB: 44.0, incline_force: 10.0, safety_margin: 4.4 },
          pass: true,
        },
        parking_brake_check_results_by_load_group: {
          AW0: {
            per_car: {
              car_1: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 5.0, safety_margin: 4.4 },
              car_2: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 5.0, safety_margin: 4.4 },
            },
            whole_train: { F_PB: 44.0, incline_force: 10.0, safety_margin: 4.4 },
            pass: true,
          },
        },
      },
      warnings: [],
    })),
    previewCalibration: vi.fn(async () => ({
      service_bcp0: 25,
      emergency_bcp0: 30,
      service_k_by_load_group: { AW0: 1014, AW2: 1100, AW3: 1204 },
      emergency_k_by_load_group: { AW0: 980, AW2: 1050, AW3: 1123 },
    })),
    openProject: vi.fn(async () => ({
      input_config_id: "mock-config-id",
      config: {
        project: {
          project_name: "上海机场线制动项目",
          project_code: "SH-HX-026",
          email: null,
          note: "",
        },
        yaml_text: "schema_version: 1\nv0: 80\n",
        form_state: { schema_version: 1, v0: 80 },
        validation_status: "valid",
        errors: [],
        version: 3,
        source_input_config_id: null,
        revision_reason: null,
        latest_run: null,
      },
    })),
    downloadYaml: vi.fn(async () => ({
      filename: "SH-HX-026_input_20260430_1200.yaml",
      yaml_text: "schema_version: 1\nv0: 80\n",
    })),
    listProjects: vi.fn(async () => ({
      items: [
        {
          project_name: "上海机场线制动项目",
          project_code: "SH-HX-026",
          updated_at: "最后修改时间",
          latest_input_config_id: "mock-config-id",
          controller_type: "bogie",
          latest_run: {
            calculation_run_id: "run-1",
            status: "succeeded",
            report: null,
            created_at: "2026-04-30T12:00:00Z",
          },
        },
        {
          project_name: "崇明线预研项目",
          project_code: "CM-PR-011",
          updated_at: "最后修改时间",
          latest_input_config_id: null,
          controller_type: "car",
          latest_run: null,
        },
      ],
    })),
    listProjectVersions: vi.fn(async () => ({
      items: [
        {
          input_config_id: "mock-config-id",
          version: 3,
          created_at: "2026-04-30T12:00:00Z",
          latest_run: {
            calculation_run_id: "run-1",
            status: "succeeded",
            report: null,
            created_at: "2026-04-30T12:00:00Z",
          },
        },
      ],
    })),
  };
});

describe("App shell", () => {
async function openWorkbenchFromHome(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
  await user.click(screen.getByRole("button", { name: "打开既有项目" }));
  await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
  await screen.findByRole("button", { name: "修订" });
  await user.click(screen.getByRole("button", { name: "修订" }));
}

  it("renders the core frontend pages and switches between them", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 2, name: "开始你的制动计算" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "新建设计项目" })
    ).toBeInTheDocument();
    expect(screen.getByText("报告获取邮箱")).toBeInTheDocument();
    expect(screen.getByText("BCU 类型")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成配置并进入工作台" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
    expect(screen.getByRole("button", { name: "新建项目计算" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开既有项目" })).toBeInTheDocument();
    expect(screen.getByText("上传 YAML")).toBeInTheDocument();
    expect(screen.getAllByText("最后修改时间").length).toBeGreaterThan(0);
    expect(screen.getByText("车控")).toBeInTheDocument();
    expect(screen.getByText("架控")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    expect(
      screen.getByRole("heading", { level: 2, name: /上海机场线制动项目/ })
    ).toBeInTheDocument();
    expect(screen.getByText("当前为只读状态。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看结果" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "修订" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "点击补录" }).length).toBe(2);
    expect(screen.getByText("最后一次运行")).toBeInTheDocument();
    expect(screen.getByText("警告与自动调整")).toBeInTheDocument();
    expect(screen.getByText("停放校核状态")).toBeInTheDocument();
    expect(screen.queryByText("电空计算")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "修订" }));
    expect(screen.getByRole("heading", { level: 2, name: "配置工作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回总览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "运行" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载 YAML" })).toBeInTheDocument();
    expect(screen.getByText("主配置")).toBeInTheDocument();
    expect(screen.getByText("后置补录")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "说明" })).toBeInTheDocument();
    expect(screen.getByText("错误")).toBeInTheDocument();
    expect(screen.getByText("YAML")).toBeInTheDocument();
    expect(screen.getAllByText("载荷与空簧").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "结果页" }));
    if (screen.queryByRole("dialog", { name: "未保存改动" }) !== null) {
      await user.click(screen.getByRole("button", { name: "确认" }));
    }
    expect(screen.getByRole("heading", { level: 2, name: "运行结果" })).toBeInTheDocument();
  });

  it("renders the load and air spring form slice inside the workbench", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));

    expect(screen.getByRole("heading", { level: 3, name: "车辆载荷参数录入" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "转向架参数录入" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "空簧特性输入" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按整车录入（推荐）" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按转向架录入" })).toBeInTheDocument();
    const hasBogieLabel =
      screen.queryAllByText((_, node) => (node?.textContent ?? "").includes("动架称重")).length > 0;
    const hasCarLabel =
      screen.queryAllByText((_, node) => (node?.textContent ?? "").includes("动车称重（整车）")).length > 0;
    expect(hasBogieLabel || hasCarLabel).toBe(true);
    expect(screen.getByRole("button", { name: "质量单位：ton" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "质量单位：kN（前端辅助换算）" })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "特征点拟合" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "显式线性公式" })).toBeInTheDocument();
    });

  it("locks load input mode to bogie when bogie instance override is enabled", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    await user.click(screen.getByRole("button", { name: "架控" }));
    await user.click(screen.getByRole("button", { name: "生成配置并进入工作台" }));
    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));
    await user.click(screen.getByRole("checkbox", { name: "实例 1 启用独立称重" }));
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));

    expect(screen.getByText(/已启用独立称重实例/)).toBeInTheDocument();
    expect(
      screen.getAllByText((_, node) => (node?.textContent ?? "").includes("动架称重")).length
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "按整车录入（推荐）" }));
    expect(
      screen.getAllByText((_, node) => (node?.textContent ?? "").includes("动架称重")).length
    ).toBeGreaterThan(0);
  });

  it("emphasizes vehicle and bogie role words in load-entry labels", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));

    expect(screen.getByRole("heading", { level: 4, name: /动架称重|动车称重（整车）/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: /拖架称重|拖车称重（整车）/ })).toBeInTheDocument();
  });

  it("switches the air spring input mode between fitted points and explicit linear formula", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));

    expect(screen.getByText("特征点 1")).toBeInTheDocument();
    expect(screen.queryByText("空簧线性系数 k (kPa/ton)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "显式线性公式" }));

    expect(screen.getByText("空簧线性系数 k (kPa/ton)")).toBeInTheDocument();
    expect(screen.getByText("空簧截距 b (kPa)")).toBeInTheDocument();
    expect(screen.getByText("公式口径说明")).toBeInTheDocument();
    expect(screen.queryByText("特征点 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "特征点拟合" }));

    expect(screen.getByText("特征点 1")).toBeInTheDocument();
    expect(screen.queryByText("空簧线性系数 k (kPa/ton)")).not.toBeInTheDocument();
  });

  it("shows one active workbench section at a time and switches through the left navigation", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));

    expect(screen.getByRole("heading", { level: 3, name: "载荷与空簧" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "停放校核" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^停放校核/ }));

    expect(screen.getByRole("heading", { level: 3, name: "停放校核" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "载荷与空簧" })
    ).not.toBeInTheDocument();
  });

  it("uses the initializer BCU type and renders the vehicle config page as instance confirmation and adjustment", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    await user.click(screen.getByRole("button", { name: "架控" }));
    await user.click(screen.getByRole("button", { name: "生成配置并进入工作台" }));
    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));

    expect(screen.getByRole("heading", { level: 3, name: "实例确认与调整" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "控制器实例列表" })).toBeInTheDocument();
    expect(
      screen.getByText("架控：每个控制器对应 1 个转向架 / 2 个空簧 / 4 个制动缸")
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "实例名称 1" })).toHaveValue("trailer_bogie_1");
    expect(screen.getByRole("button", { name: "实例 1 设为拖架" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("textbox", { name: "实例名称 2" })).toHaveValue("trailer_bogie_2");
    expect(screen.getByRole("button", { name: "实例 2 设为拖架" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.queryByRole("heading", { level: 4, name: "当前控制粒度" })).not.toBeInTheDocument();
    expect(screen.queryByText("控制粒度已在新建初始化中确定")).not.toBeInTheDocument();
  });

  it("lets vehicle instances adjust only names and powered or trailer type with total count checking", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    await user.click(screen.getByRole("button", { name: "车控" }));
    await user.click(screen.getByRole("button", { name: "生成配置并进入工作台" }));
    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));

    expect(screen.getByText(/编组校核通过/)).toBeInTheDocument();
    expect(screen.getByText("目标编组")).toBeInTheDocument();
    expect(screen.getByText("当前编组")).toBeInTheDocument();
    expect(screen.getAllByText("动车 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("拖车 1").length).toBeGreaterThan(0);

    expect(screen.getByRole("textbox", { name: "实例名称 1" })).toHaveValue("trailer_car_1");
    expect(screen.getByRole("button", { name: "实例 1 设为拖车" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "实例 1 设为动车" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.queryByText("控制制动缸数量：8")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "实例 1 设为动车" }));

    expect(screen.getByText("动车 2")).toBeInTheDocument();
    expect(screen.getByText("拖车 0")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "实例名称 1" })).toHaveValue("powered_car_1");
    expect(screen.getByText(/编组校核需确认/)).toHaveStyle({ color: "rgb(198, 69, 50)" });
  });

  it("generates bogie controller instances from initializer car counts", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    await user.click(screen.getByRole("button", { name: "架控" }));

    await user.clear(screen.getByRole("spinbutton", { name: "总车数" }));
    await user.type(screen.getByRole("spinbutton", { name: "总车数" }), "6");
    await user.clear(screen.getByRole("spinbutton", { name: "动车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "动车数量" }), "2");
    await user.clear(screen.getByRole("spinbutton", { name: "拖车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "拖车数量" }), "4");

    await user.click(screen.getByRole("button", { name: "生成配置并进入工作台" }));
    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));

    expect(screen.getAllByText("动架 4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("拖架 8").length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: "实例名称 1" })).toHaveValue("trailer_bogie_1");
    expect(screen.getByRole("textbox", { name: "实例名称 2" })).toHaveValue("trailer_bogie_2");
    expect(screen.getByRole("textbox", { name: "实例名称 12" })).toHaveValue("powered_bogie_12");
    expect(screen.getByRole("button", { name: "实例 12 设为拖架" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "实例 12 设为动架" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText(/编组校核通过/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "实例 6 设为动架" }));

    expect(screen.getByRole("textbox", { name: "实例名称 6" })).toHaveValue("powered_bogie_6");
  });

  it("validates initializer car counts before generating controller instances", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建初始化" }));

    await user.clear(screen.getByRole("spinbutton", { name: "总车数" }));
    await user.type(screen.getByRole("spinbutton", { name: "总车数" }), "0");

    expect(screen.getByText("总车数必须大于 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成配置并进入工作台" })).toBeDisabled();

    await user.clear(screen.getByRole("spinbutton", { name: "总车数" }));
    await user.clear(screen.getByRole("spinbutton", { name: "总车数" }));
    await user.clear(screen.getByRole("spinbutton", { name: "总车数" }));
    await user.type(screen.getByRole("spinbutton", { name: "总车数" }), "3");
    await user.clear(screen.getByRole("spinbutton", { name: "动车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "动车数量" }), "1");
    await user.clear(screen.getByRole("spinbutton", { name: "拖车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "拖车数量" }), "1");

    expect(screen.getByText("动车数量与拖车数量之和必须等于总车数")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成配置并进入工作台" })).toBeDisabled();

    await user.clear(screen.getByRole("spinbutton", { name: "拖车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "拖车数量" }), "2");

    expect(screen.queryByText("动车数量与拖车数量之和必须等于总车数")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成配置并进入工作台" })).toBeEnabled();
  });

  it("supports mixed bogie vehicle mode from initializer through workbench target checks", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    await user.click(screen.getByRole("button", { name: "架控" }));

    const mixedModeToggle = screen.getByRole("checkbox", { name: "存在动/拖架混合车辆" });
    expect(mixedModeToggle).toBeInTheDocument();
    expect(screen.queryByText("请按车辆口径填写混合车、拖车、动车数量。")).not.toBeInTheDocument();

    await user.click(mixedModeToggle);

    expect(screen.getByText("已切换编组模式，请重新填写车辆数量。")).toBeInTheDocument();
    expect(screen.getByText("请按车辆口径填写混合车、拖车、动车数量。")).toBeInTheDocument();
    expect(screen.getByText("混合车按 1 辆拖车计入拖车数量；生成实例后，将默认把首辆拖车生成为 1 个拖架 + 1 个动架。")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "混合车数量" })).toHaveValue(0);
    expect(screen.getByRole("spinbutton", { name: "拖车数量" })).toHaveValue(0);
    expect(screen.getByRole("spinbutton", { name: "动车数量" })).toHaveValue(0);

    await user.clear(screen.getByRole("spinbutton", { name: "总车数" }));
    await user.type(screen.getByRole("spinbutton", { name: "总车数" }), "3");
    await user.clear(screen.getByRole("spinbutton", { name: "混合车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "混合车数量" }), "1");

    expect(screen.queryByText("已切换编组模式，请重新填写车辆数量。")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("spinbutton", { name: "动车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "动车数量" }), "3");

    expect(screen.getByText("混合车数量、拖车数量与动车数量之和必须等于总车数")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成配置并进入工作台" })).toBeDisabled();

    await user.clear(screen.getByRole("spinbutton", { name: "动车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "动车数量" }), "2");
    await user.clear(screen.getByRole("spinbutton", { name: "拖车数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "拖车数量" }), "0");
    expect(screen.queryByText("混合车数量、拖车数量与动车数量之和必须等于总车数")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成配置并进入工作台" }));
    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));

    expect(screen.getByText("目标编组")).toBeInTheDocument();
    expect(screen.getByText("当前编组")).toBeInTheDocument();
    expect(screen.getByText("编组校核")).toBeInTheDocument();
    expect(screen.getAllByText("动架 5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("拖架 1").length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: "实例名称 1" })).toHaveValue("trailer_bogie_1");
    expect(screen.getByRole("textbox", { name: "实例名称 2" })).toHaveValue("powered_bogie_2");
    expect(screen.getByRole("textbox", { name: "实例名称 3" })).toHaveValue("powered_bogie_3");
    expect(screen.getByText(/编组校核通过/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "实例 1 设为动架" }));

    expect(screen.getByText(/编组校核需确认/)).toHaveStyle({ color: "rgb(198, 69, 50)" });
  });

  it("renders the technical conditions slice with business labels and brake type controls", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));

    expect(screen.getByRole("heading", { level: 3, name: "运行基础配置 / 技术条件" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "最大常用制动" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "紧急制动" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "快速制动" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "其他制动类型" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "常用制动分配方式" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "全局黏着限制" })).toBeInTheDocument();
    expect(screen.getByText("最高速度 v0 (km/h)")).toBeInTheDocument();
    expect(screen.getByText("最大常用制动平均减速度要求 (m/s²)")).toBeInTheDocument();
    expect(screen.getAllByText("空走时间 t1 (s)").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("冲击率 impulse_rate (m/s³)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "不同初速度下的制动距离校核要求" })).toBeInTheDocument();
    expect(screen.getByText(/最高速度 v0 默认参与校核/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加待校核速度" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按平均减速度录入" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按制动距离录入" })).toBeInTheDocument();
    expect(screen.getByText("紧急制动平均减速度要求 (m/s²)")).toBeInTheDocument();
    expect(screen.getByText("紧急制动响应时间 t2 (s)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "启用快速制动" })).toBeInTheDocument();
    expect(screen.queryByText("快速制动空走时间 t1 (s)")).not.toBeInTheDocument();
    expect(screen.queryByText("快速制动冲击率 impulse_rate (m/s³)")).not.toBeInTheDocument();
    expect(screen.getByText(/快速制动控制目标跟随紧急制动/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "等磨耗" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "等黏着" })).toBeInTheDocument();
    expect(screen.getByText("制动类型代号")).toBeInTheDocument();
    expect(screen.getByText("相对最大常用制动比例 (%)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加制动类型" })).toBeInTheDocument();
    expect(screen.getByText("黏着利用限制 mu_limit (-)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "按制动距离录入" }));

    expect(screen.getByText("紧急制动距离要求 (m)")).toBeInTheDocument();
    expect(screen.queryByText("紧急制动平均减速度要求 (m/s²)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加待校核速度" }));

    expect(screen.getByText("待校核速度 1 (km/h)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加制动类型" }));

    expect(screen.getByText("制动类型代号 2")).toBeInTheDocument();
    expect(screen.getByText("相对最大常用制动比例 2 (%)")).toBeInTheDocument();
  });

  it("uses ratio brake defaults and validates ratio brake names and percentage inputs", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));

    const firstNameInput = screen.getByRole("textbox", {
      name: "制动类型代号"
    });
    const firstRatioInput = screen.getByRole("spinbutton", {
      name: "相对最大常用制动比例 (%)"
    });

    expect(firstNameInput).toHaveValue("holding");
    expect(firstRatioInput).toHaveValue(50);
    expect(screen.getAllByText("%").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "添加制动类型" }));

    expect(
      screen.getByRole("textbox", { name: "制动类型代号 2" })
    ).toHaveValue("holding_2");

    await user.clear(firstNameInput);
    await user.type(firstNameInput, "中文");
    await user.tab();

    expect(screen.getByText("仅支持英文、数字、下划线")).toBeInTheDocument();

    await user.clear(firstNameInput);
    await user.type(firstNameInput, "holding_2");
    await user.tab();

    expect(screen.getByText("制动类型代号不可重复")).toBeInTheDocument();

    await user.clear(firstRatioInput);
    await user.type(firstRatioInput, "101");
    await user.tab();

    expect(screen.getByText("请输入 1 到 100 的整数")).toBeInTheDocument();
  });

  it("validates speed checks as positive integers not exceeding v0 and allows deletion", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));

    const v0Input = screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" });
    await user.clear(v0Input);
    await user.type(v0Input, "80");
    await user.tab();

    await user.click(screen.getByRole("button", { name: "添加待校核速度" }));

    const speedInput = screen.getByRole("spinbutton", { name: "待校核速度 1 (km/h)" });
    await user.type(speedInput, "90");
    await user.tab();

    expect(screen.getByText("待校核速度不能超过最高速度 v0")).toBeInTheDocument();

    await user.clear(speedInput);
    await user.type(speedInput, "12.5");
    await user.tab();

    expect(screen.getByText("请输入正整数")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除待校核速度 1" }));

    expect(screen.queryByRole("spinbutton", { name: "待校核速度 1 (km/h)" })).not.toBeInTheDocument();
  });

  it("renders the base brake mechanical slice with unit hints and parking boundary", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^基础制动机械参数/ }));

    expect(screen.getByRole("heading", { level: 3, name: "基础制动机械参数" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "基础制动缸参数" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "踏面制动 tread_cylinder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "制动夹钳 caliper_cylinder" })).toBeInTheDocument();
    expect(screen.getAllByText("单位提示").length).toBeGreaterThan(0);
    expect(screen.getByText(/停放缸参数不在本章/)).toBeInTheDocument();
    expect(screen.getByText("活塞有效面积 Sc (m²)")).toBeInTheDocument();
    expect(screen.getByText("摩擦系数 xi (-)")).toBeInTheDocument();
    expect(screen.getByText("单元内部倍率 Li (-)")).toBeInTheDocument();
    expect(screen.getByText("单元内部效率 eta_i (-)")).toBeInTheDocument();
    expect(screen.getByText("外部倍率 Lo (-)")).toBeInTheDocument();
    expect(screen.getByText("外部效率 eta_o (-)")).toBeInTheDocument();
    expect(screen.getByText("单元复位力 Fs1 (kN)")).toBeInTheDocument();
    expect(screen.getByText("单元复位力 Fs2 (kN)")).toBeInTheDocument();
    expect(screen.queryByText("制动缸缸径 (mm)")).not.toBeInTheDocument();
    expect(screen.queryByText("单缸作用力 (kN)")).not.toBeInTheDocument();
    expect(screen.queryByText("制动单元数量 (-)")).not.toBeInTheDocument();
    expect(screen.queryByText("制动倍率 Beta (-)")).not.toBeInTheDocument();
    expect(screen.queryByText("杠杆比 Lpi / Lo")).not.toBeInTheDocument();
    expect(screen.queryByText("轮径 Dw (m)")).not.toBeInTheDocument();
    expect(screen.queryByText("摩擦半径 Rf (m)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "制动夹钳 caliper_cylinder" }));

    expect(screen.getByText("轮径 Dw (m)")).toBeInTheDocument();
    expect(screen.getByText("摩擦半径 Rf (m)")).toBeInTheDocument();
  });

  it("renders the parking brake supplement slice as input only using contract fields", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^停放校核/ }));

    expect(screen.getByRole("heading", { level: 3, name: "停放校核" })).toBeInTheDocument();
    expect(screen.getByText("当前状态：未补充停放校核")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "校核配置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "环境条件" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "停放缸参数" })).toBeInTheDocument();
    expect(screen.getByText("要求安全系数 required_safety_margin (-)")).toBeInTheDocument();
    expect(screen.getByText("静摩擦系数 xi0 / static_friction_coefficient (-)")).toBeInTheDocument();
    expect(screen.getByText("每车停放缸数量 n_parking_cylinders_by_car (-)")).toBeInTheDocument();
    expect(screen.getByText("最大风速 wind_speed_max (m/s)")).toBeInTheDocument();
    expect(screen.getByText("风阻系数 wind_resistance_coefficient (-)")).toBeInTheDocument();
    expect(screen.getByText("AW0 坡度 grade_by_load_group.AW0 (‰)")).toBeInTheDocument();
    expect(screen.getByText("AW3 坡度 grade_by_load_group.AW3 (‰)")).toBeInTheDocument();
    expect(screen.getByText("停放弹簧输出力 Fp (kN)")).toBeInTheDocument();
    expect(screen.getByText("停放缸内部倍率 Lpi (-)")).toBeInTheDocument();
    expect(screen.getByText("停放缸内部效率 eta_pi (-)")).toBeInTheDocument();
    expect(screen.getByText("执行机构外部倍率 Lo (-)")).toBeInTheDocument();
    expect(screen.getByText("执行机构外部效率 eta_o (-)")).toBeInTheDocument();
    expect(screen.queryByText("停放缸作用力 (kN)")).not.toBeInTheDocument();
    expect(screen.queryByText("停车校核摩擦半径 Rf (mm)")).not.toBeInTheDocument();
    expect(screen.queryByText("线路条件备注")).not.toBeInTheDocument();
    expect(screen.queryByText("F_N_PB")).not.toBeInTheDocument();
    expect(screen.queryByText("F_PB")).not.toBeInTheDocument();
    expect(screen.queryByText("whole_train")).not.toBeInTheDocument();
  });

  it("renders the car-controller calibration slice with service card only and a car EB warning", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^标定/ }));

    expect(screen.getByRole("heading", { level: 3, name: "标定" })).toBeInTheDocument();
    expect(screen.getByText(/本页录入的是试验点驱动的实设系数/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "常用控制系数标定" })).toBeInTheDocument();
    expect(screen.getByText("当前状态：未配置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AW3-AW0 模式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AW3-AW2 模式" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "常用实设出闸压力 BCP0 (kPa)" })).toBeInTheDocument();
    expect(screen.getAllByText("理论参考值").length).toBeGreaterThan(0);
    expect(screen.getByText("试验点 1（AW3）")).toBeInTheDocument();
    expect(screen.getByText("试验点 2（AW0）")).toBeInTheDocument();
    expect(screen.getAllByText("制动类型").length).toBeGreaterThan(0);
    expect(screen.getByRole("spinbutton", { name: "常用试验点1 k_for_code" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "常用试验点2 k_for_code" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "V1.0 暂不支持车控紧急制动的压力标定。当前 EB 结果仍使用理论压力计算结果，紧急制动的压力调整需要人工在计算报告中手动调整。"
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 4, name: "紧急控制系数标定" })
    ).not.toBeInTheDocument();
  });

  it("renders separate service and emergency calibration cards for bogie controller projects", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    await user.click(screen.getByRole("button", { name: "架控" }));
    await user.click(screen.getByRole("button", { name: "生成配置并进入工作台" }));
    await user.click(screen.getByRole("button", { name: /^标定/ }));

    expect(screen.getByRole("heading", { level: 4, name: "常用控制系数标定" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "紧急控制系数标定" })).toBeInTheDocument();
    expect(screen.getAllByText("当前状态：未配置").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("试验点 1（AW3）").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("试验点 2（AW0）").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("制动类型固定为 EB").length).toBeGreaterThanOrEqual(2);
  });

  it("hides the electric brake supplement entry from current frontend navigation", async () => {
    const user = userEvent.setup();

    render(<App />);

    await openWorkbenchFromHome(user);

    expect(screen.queryByRole("button", { name: /^电空计算/ })).not.toBeInTheDocument();
  });

  it("renders the result page with summary, performance checks, pressure matrix and controller params", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    await screen.findByRole("button", { name: "查看结果" });
    await user.click(screen.getByRole("button", { name: "查看结果" }));

    expect(screen.getByRole("heading", { level: 2, name: "运行结果" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "回到总览" })).toBeInTheDocument();
    expect(screen.getByText("运行状态")).toBeInTheDocument();
    expect(screen.getByText("警告")).toBeInTheDocument();
    expect(screen.getByText("自动调整")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "制动性能检查" })).toBeInTheDocument();
    expect(screen.getByText("初速度 (km/h)")).toBeInTheDocument();
    expect(screen.getByText("初速度 (km/h)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "压力矩阵" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按载荷类型" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按控制器" })).toBeInTheDocument();
    expect(screen.getByText("动态载荷 mass_dyn_t (ton)")).toBeInTheDocument();
    expect(screen.getByText("标准空簧压力 spring_kPa")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "按控制器" }));
    expect(screen.getByText("载荷类型")).toBeInTheDocument();
    expect(screen.getByText("动态载荷 (ton)")).toBeInTheDocument();
    expect(screen.getByText("标准空簧 (kPa)")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 3, name: "控制器开发参数" })).toBeInTheDocument();
    expect(screen.getByText("原始计算值（流程输入基值）")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "标定摘要" })).toBeInTheDocument();
    expect(screen.getByText("后端标定曲线")).toBeInTheDocument();
    expect(screen.getByText(/同一坐标轴下的 service_brake 与 emergency_brake 分段曲线/)).toBeInTheDocument();
    expect(screen.getByText(/车控 EB 实际 BCP 压力标定 V1.0 暂不支持/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "停放校核结果（未开启）" })).toBeInTheDocument();
    expect(screen.queryByText("F_N_PB 单个制动单元双侧作用力")).not.toBeInTheDocument();
  });

  it("renders the import summary page with supplement recognition, warnings and run readiness", async () => {
    const user = userEvent.setup();

    render(<App />);

    const file = new File(["schema_version: 1\nv0: 80\n"], "import_summary_entry.yaml", {
      type: "text/yaml"
    });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    expect(await screen.findByRole("heading", { level: 2, name: "导入摘要" })).toBeInTheDocument();
    expect(screen.getByText("是否包含停放校核 / 标定 / electric_brake 等后置内容")).toBeInTheDocument();
    expect(screen.getByText("是否存在导入警告")).toBeInTheDocument();
    expect(screen.getByText("是否可直接运行")).toBeInTheDocument();
    expect(screen.getByText("导入 YAML 不包含项目元数据，请先补全后再保存为配置版本。")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "项目名称" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "项目编号" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "导入 YAML 文本" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存并查看总览" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存并查看总览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览总览" })).toBeInTheDocument();
    expect(screen.getByText("请先补全：项目名称、项目编号。")).toBeInTheDocument();
  });

  it("navigates between overview, result, import summary, wizard and workbench through primary actions", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    await user.click(screen.getByRole("button", { name: "生成配置并进入工作台" }));
    expect(screen.getByRole("heading", { level: 2, name: "配置工作台" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "返回总览" }));
    expect(
      screen.getByRole("heading", { level: 2, name: /上海机场线制动项目/ })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "查看结果" }));
    expect(screen.getByRole("heading", { level: 2, name: "运行结果" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "回到总览" }));
    expect(
      screen.getByRole("heading", { level: 2, name: /上海机场线制动项目/ })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "导入摘要" }));
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "导入项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    expect(
      await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|导入项目/ })
    ).toBeInTheDocument();
  });

  it("uses home page entry actions to start a new project or open an existing one", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "新建项目计算" }));
    expect(screen.getByRole("heading", { level: 2, name: "新建设计项目" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
    await user.click(screen.getAllByRole("button", { name: "打开" })[0]);
    expect(
      screen.getByRole("heading", { level: 2, name: /上海机场线制动项目|导入项目/ })
    ).toBeInTheDocument();
  });

  it("loads yaml content from file upload and opens import summary with prefilled text", async () => {
    const user = userEvent.setup();

    render(<App />);

    const file = new File(["schema_version: 1\nv0: 120\n"], "example_input.yaml", {
      type: "text/yaml"
    });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    expect(await screen.findByRole("heading", { level: 2, name: "导入摘要" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "导入 YAML 文本" })).toHaveValue(
      "schema_version: 1\nv0: 120\n"
    );
  });

  it("backfills imported yaml values into workbench load and air spring fields", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "mass_params:",
      "  powered_bogie:",
      "    mass_static:",
      "      AW0: 15.83",
      "      AW3: 26.37",
      "    bogie_weight: 6.3",
      "  trailer_bogie:",
      "    mass_static:",
      "      AW0: 15.37",
      "      AW3: 25.18",
      "    bogie_weight: 4.1",
      "air_spring:",
      "  powered_bogie:",
      "    mode: explicit_linear",
      "    airspring_k: 43.69",
      "    airspring_b: 4.13",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_input.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "导入项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-002");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    expect(
      await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|导入项目/ })
    ).toBeInTheDocument();

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));
    const aw0MassInputs = screen.getAllByRole("textbox", { name: "AW0 称重 (ton)" });
    const aw3MassInputs = screen.getAllByRole("textbox", { name: "AW3 称重 (ton)" });
    expect(aw0MassInputs[0]).toHaveValue("15.37");
    expect(aw0MassInputs[1]).toHaveValue("15.83");
    expect(aw3MassInputs[0]).toHaveValue("25.18");
    expect(aw3MassInputs[1]).toHaveValue("26.37");
    expect(screen.getByRole("textbox", { name: "动车转向架重量 bogie_weight (ton)" })).toHaveValue("6.3");
    expect(screen.getByRole("textbox", { name: "拖车转向架重量 bogie_weight (ton)" })).toHaveValue("4.1");

    await user.click(screen.getByRole("button", { name: "显式线性公式" }));
    expect(screen.getByRole("textbox", { name: "空簧线性系数 k (kPa/ton)" })).toHaveValue("43.69");
    expect(screen.getByRole("textbox", { name: "空簧截距 b (kPa)" })).toHaveValue("4.13");
  });

  it("navigates from overview supplement cards into targeted workbench sections", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    await user.click(screen.getAllByRole("button", { name: "点击补录" })[0]);
    expect(screen.getByRole("heading", { level: 3, name: "停放校核" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "返回总览" }));
    if (screen.queryByRole("dialog", { name: "未保存改动" }) !== null) {
      await user.click(screen.getByRole("button", { name: "确认" }));
    }
    await user.click(screen.getAllByRole("button", { name: "点击补录" })[1]);
    expect(screen.getByRole("heading", { level: 3, name: "标定" })).toBeInTheDocument();
  });

  it("opens workbench when clicking revise from overview", async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    await user.click(screen.getByRole("button", { name: "修订" }));

    expect(screen.getByRole("heading", { level: 2, name: "配置工作台" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "运行基础配置 / 技术条件" })).toBeInTheDocument();
  });

  it("backfills requirement fields after revise from imported overview", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "v0: 80.0",
      "V_list: [40.0,60.0,80.0]",
      "brake_types:",
      "  - name: FSB",
      "    source: kinematic",
      "  - name: EB",
      "    source: kinematic",
      "  - name: FB",
      "    source: kinematic",
      "  - name: holding",
      "    source: ratio_of_FSB",
      "    ratio: 0.5",
      "requirement:",
      "  FSB:",
      "    mode: a_mean",
      "    value: 1.0",
      "  EB:",
      "    mode: distance",
      "    value: 205.0",
      "response_time:",
      "  FSB:",
      "    t1: 0.4",
      "    impulse_rate: 0.75",
      "  EB:",
      "    t1: 0.3",
      "    t2: 1.2",
      "adhesion:",
      "  mu_limit: 0.15",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_input.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "导入项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-003");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));

    await screen.findByRole("button", { name: "修订" });
    await user.click(screen.getByRole("button", { name: "修订" }));

    expect(screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" })).toHaveValue(80);
    expect(screen.getByRole("spinbutton", { name: "最大常用制动平均减速度要求 (m/s²)" })).toHaveValue(1);
    expect(screen.getAllByRole("spinbutton", { name: "空走时间 t1 (s)" })[0]).toHaveValue(0.4);
    expect(screen.getByRole("spinbutton", { name: "冲击率 impulse_rate (m/s³)" })).toHaveValue(0.75);
    expect(screen.getByRole("spinbutton", { name: "紧急制动距离要求 (m)" })).toHaveValue(205);
    expect(screen.getByRole("spinbutton", { name: "紧急制动响应时间 t2 (s)" })).toHaveValue(1.2);
    expect(screen.getByRole("spinbutton", { name: "黏着利用限制 mu_limit (-)" })).toHaveValue(0.15);
  });

  it("backfills vehicle_config instances after import and revise", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "controller_type: bogie",
      "vehicle_config:",
      "  bogies:",
      "    - name: trailer_bogie_11",
      "      bogie_type: trailer_bogie",
      "    - name: powered_bogie_12",
      "      bogie_type: powered_bogie",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_vehicle.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "车辆回填项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-VC-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|车辆回填项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));

    expect(screen.getByText(/当前 BCU 类型：/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "实例名称 1" })).toHaveValue("trailer_bogie_11");
    expect(screen.getByRole("textbox", { name: "实例名称 2" })).toHaveValue("powered_bogie_12");
    expect(screen.getByRole("button", { name: "实例 1 设为拖架" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "实例 2 设为动架" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("infers bogie controller type from vehicle_config.bogies when controller_type is missing", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "vehicle_config:",
      "  bogies:",
      "    - name: trailer_bogie_11",
      "      bogie_type: trailer_bogie",
      "    - name: powered_bogie_12",
      "      bogie_type: powered_bogie",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_vehicle_no_controller_type.yaml", {
      type: "text/yaml"
    });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "实例回填兜底项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-VC-002");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|实例回填兜底项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));

    expect(screen.getByText(/当前 BCU 类型：架控/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "实例名称 1" })).toHaveValue("trailer_bogie_11");
    expect(screen.getByRole("textbox", { name: "实例名称 2" })).toHaveValue("powered_bogie_12");
  });

  it("backfills air spring fitted points from imported yaml", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "air_spring:",
      "  powered_bogie:",
      "    mode: fitted_from_points",
      "    points:",
      "      - pressure_kpa: 101",
      "        sprung_mass_by_spring_ton: 10.1",
      "      - pressure_kpa: 202",
      "        sprung_mass_by_spring_ton: 20.2",
      "      - pressure_kpa: 303",
      "        sprung_mass_by_spring_ton: 30.3",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_airspring.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "空簧回填项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-AS-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|空簧回填项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));
    expect(screen.getByRole("button", { name: "特征点拟合" })).toHaveAttribute("aria-pressed", "true");
    const pressureInputs = screen.getAllByRole("textbox", { name: "压力 (kPa)" });
    const massInputs = screen.getAllByRole("textbox", { name: "单根空簧簧上质量 (ton)" });
    expect(pressureInputs[0]).toHaveValue("101");
    expect(massInputs[0]).toHaveValue("10.1");
    expect(pressureInputs[1]).toHaveValue("202");
    expect(massInputs[1]).toHaveValue("20.2");
    expect(pressureInputs[2]).toHaveValue("303");
    expect(massInputs[2]).toHaveValue("30.3");
  });

  it("backfills mech_params and switches to caliper fields from imported yaml", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "mech_params:",
      "  cylinder_type: caliper_cylinder",
      "  Sc: 0.0248",
      "  xi: 0.29",
      "  Li: 3.4",
      "  eta_i: 0.95",
      "  Lo: 1.0",
      "  eta_o: 1.0",
      "  Fs1: 1.0",
      "  Fs2: 0.25",
      "  Dw: 0.84",
      "  Rf: 0.12",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_mech.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "机械参数回填项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-MP-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|机械参数回填项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^基础制动机械参数/ }));
    expect(screen.getByRole("button", { name: "制动夹钳 caliper_cylinder" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("textbox", { name: "活塞有效面积 Sc (m²)" })).toHaveValue("0.0248");
    expect(screen.getByRole("textbox", { name: "摩擦系数 xi (-)" })).toHaveValue("0.29");
    expect(screen.getByRole("textbox", { name: "单元内部倍率 Li (-)" })).toHaveValue("3.4");
    expect(screen.getByRole("textbox", { name: "单元内部效率 eta_i (-)" })).toHaveValue("0.95");
    expect(screen.getByRole("textbox", { name: "外部倍率 Lo (-)" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "外部效率 eta_o (-)" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "单元复位力 Fs1 (kN)" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "单元复位力 Fs2 (kN)" })).toHaveValue("0.25");
    expect(screen.getByRole("textbox", { name: "轮径 Dw (m)" })).toHaveValue("0.84");
    expect(screen.getByRole("textbox", { name: "摩擦半径 Rf (m)" })).toHaveValue("0.12");
  });

  it("shows YAML and form_state mismatch warning when key exists only in YAML text", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "controller_type: BOGIE",
      "vehicle_config:",
      "  bogies:",
      "    - name: trailer_bogie_1",
      "      bogie_type: trailer_bogie",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_mismatch.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "差异告警项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-DIFF-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|差异告警项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    expect(screen.getByText("YAML / form_state 不一致")).toBeInTheDocument();
    expect(
      screen.getByText(/字段 controller_type 在 YAML 中存在，但未进入 form_state/)
    ).toBeInTheDocument();
  });

  it("uses imported vehicle_config as baseline instead of initializer target counts", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "controller_type: bogie",
      "vehicle_config:",
      "  bogies:",
      "    - name: trailer_bogie_1",
      "      bogie_type: trailer_bogie",
      "    - name: trailer_bogie_2",
      "      bogie_type: trailer_bogie",
      "    - name: powered_bogie_3",
      "      bogie_type: powered_bogie",
      "    - name: powered_bogie_4",
      "      bogie_type: powered_bogie",
      "    - name: powered_bogie_5",
      "      bogie_type: powered_bogie",
      "    - name: powered_bogie_6",
      "      bogie_type: powered_bogie",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_import_baseline.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "导入基准项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-BASE-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|导入基准项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));

    expect(screen.getByText("导入基准编组")).toBeInTheDocument();
    expect(screen.getAllByText("动架 4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("拖架 2").length).toBeGreaterThan(0);
    expect(screen.getByText(/编组校核通过/)).toBeInTheDocument();
  });

  it("backfills parking_brake_check fields from imported yaml", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "parking_brake_check:",
      "  enabled: true",
      "  required_safety_margin: 1.2",
      "  static_friction_coefficient: 0.35",
      "  n_parking_cylinders_by_car: 4",
      "  environment:",
      "    wind_speed_max: 34.0",
      "    wind_resistance_coefficient: 0.0037",
      "    grade_by_load_group:",
      "      AW0: 40",
      "      AW2: 30",
      "      AW3: 40",
      "  cylinder:",
      "    Fp: 7.4",
      "    Fs1: 1.0",
      "    Fs2: 0.25",
      "    Lpi: 2.04",
      "    eta_pi: 1.0",
      "    Lo: 1.0",
      "    eta_o: 1.0",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_parking.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "停放回填项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-PB-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|停放回填项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^停放校核/ }));

    expect(screen.getByText("当前状态：已补充停放校核")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "要求安全系数 required_safety_margin (-)" })).toHaveValue("1.2");
    expect(screen.getByRole("textbox", { name: "静摩擦系数 xi0 / static_friction_coefficient (-)" })).toHaveValue("0.35");
    expect(screen.getByRole("textbox", { name: "每车停放缸数量 n_parking_cylinders_by_car (-)" })).toHaveValue("4");
    expect(screen.getByRole("textbox", { name: "最大风速 wind_speed_max (m/s)" })).toHaveValue("34");
    expect(screen.getByRole("textbox", { name: "风阻系数 wind_resistance_coefficient (-)" })).toHaveValue("0.0037");
    expect(screen.getByRole("textbox", { name: "AW0 坡度 grade_by_load_group.AW0 (‰)" })).toHaveValue("40");
    expect(screen.getByRole("textbox", { name: "AW2 坡度 grade_by_load_group.AW2 (‰)" })).toHaveValue("30");
    expect(screen.getByRole("textbox", { name: "AW3 坡度 grade_by_load_group.AW3 (‰)" })).toHaveValue("40");
    expect(screen.getByRole("textbox", { name: "停放弹簧输出力 Fp (kN)" })).toHaveValue("7.4");
    expect(screen.getByRole("textbox", { name: "单元复位力 Fs1 (kN)" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "单元复位力 Fs2 (kN)" })).toHaveValue("0.25");
    expect(screen.getByRole("textbox", { name: "停放缸内部倍率 Lpi (-)" })).toHaveValue("2.04");
    expect(screen.getByRole("textbox", { name: "停放缸内部效率 eta_pi (-)" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "执行机构外部倍率 Lo (-)" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "执行机构外部效率 eta_o (-)" })).toHaveValue("1");
  });

  it("keeps calibration status off when pressure_calibration.enabled is false after import", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "pressure_calibration:",
      "  enabled: false",
      "  service_brake:",
      "    BCP0: 25.0",
      "    point_pair_mode: aw3_aw0",
      "    points:",
      "      - load_group: AW0",
      "        brake_type: FSB",
      "        k_for_code: 1014.0",
      "      - load_group: AW3",
      "        brake_type: FB",
      "        k_for_code: 1204.0",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_calibration_disabled.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);

    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "标定状态项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-CAL-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|标定状态项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^标定/ }));
    expect(screen.getByText("当前状态：未配置")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "启用标定" }));
    expect(screen.getByText("当前状态：已配置")).toBeInTheDocument();
  });

  it("keeps wizard entry available after import while overview still blocks direct result without run", async () => {
    const user = userEvent.setup();

    render(<App />);

    const file = new File(["schema_version: 1\nv0: 80\n"], "example_disable_wizard.yaml", {
      type: "text/yaml"
    });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "禁用初始化项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-DISABLE-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|禁用初始化项目/ });

    expect(screen.getByRole("button", { name: "新建初始化" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "查看结果" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "查看结果" })).toHaveAttribute("title", "暂无结果（请先运行）");
    expect(screen.getByText("暂无结果（请先运行）。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "首页 / 项目列表" })).toBeEnabled();
  });

  it("allows toggling parking enabled state after importing disabled parking section", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "parking_brake_check:",
      "  enabled: false",
      "  required_safety_margin: 1.2",
      "  static_friction_coefficient: 0.35",
      "  n_parking_cylinders_by_car: 4",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_parking_disabled.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "停放开关项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-PARK-002");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|停放开关项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^停放校核/ }));
    expect(screen.getByText("当前状态：未补充停放校核")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "启用停放校核" }));
    expect(screen.getByText("当前状态：已补充停放校核")).toBeInTheDocument();
  });

  it("omits disabled calibration and parking details when saving a workbench draft", async () => {
    const user = userEvent.setup();

    render(<App />);
    await openWorkbenchFromHome(user);

    await user.click(screen.getByRole("button", { name: /^标定/ }));
    await user.click(screen.getByRole("button", { name: "停用标定" }));
    await user.click(screen.getByRole("button", { name: /^停放校核/ }));
    await user.click(screen.getByRole("button", { name: "停用停放校核" }));

    await user.click(screen.getByRole("button", { name: "保存" }));
    await user.click(screen.getByRole("button", { name: "确认保存" }));

    const savePayload = vi.mocked(saveConfig).mock.calls.at(-1)?.[0] as
      | { form_state?: Record<string, unknown> }
      | undefined;
    const formState = savePayload?.form_state ?? {};
    const pressureCalibration = (formState.pressure_calibration ?? {}) as Record<string, unknown>;
    const parkingBrakeCheck = (formState.parking_brake_check ?? {}) as Record<string, unknown>;

    expect(pressureCalibration.enabled).toBe(false);
    expect(pressureCalibration).not.toHaveProperty("service_brake");
    expect(pressureCalibration).not.toHaveProperty("emergency_brake");
    expect(parkingBrakeCheck.enabled).toBe(false);
    expect(parkingBrakeCheck).not.toHaveProperty("cylinder");
    expect(parkingBrakeCheck).not.toHaveProperty("environment");
  });

  it("omits Dw and Rf when saving tread cylinder mech params", async () => {
    const user = userEvent.setup();

    render(<App />);
    await openWorkbenchFromHome(user);

    await user.click(screen.getByRole("button", { name: /^基础制动机械参数/ }));
    expect(screen.getByRole("button", { name: "踏面制动 tread_cylinder" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await user.click(screen.getByRole("button", { name: "保存" }));
    await user.click(screen.getByRole("button", { name: "确认保存" }));

    const savePayload = vi.mocked(saveConfig).mock.calls.at(-1)?.[0] as
      | { form_state?: Record<string, unknown> }
      | undefined;
    const mechParams = ((savePayload?.form_state ?? {}).mech_params ?? {}) as Record<string, unknown>;

    expect(mechParams.cylinder_type).toBe("tread_cylinder");
    expect(mechParams).not.toHaveProperty("Dw");
    expect(mechParams).not.toHaveProperty("Rf");
  });

  it("starts a fresh draft from new initializer instead of inheriting the active config", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "mech_params:",
      "  cylinder_type: caliper_cylinder",
      "  Sc: 0.0248",
      "  xi: 0.29",
      "  Li: 3.4",
      "  eta_i: 0.95",
      "  Lo: 1.0",
      "  eta_o: 1.0",
      "  Fs1: 1.0",
      "  Fs2: 0.25",
      "  Dw: 0.84",
      "  Rf: 0.12",
      "",
    ].join("\n");
    const file = new File([yamlText], "example_new_initializer_reset.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "旧配置项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-RESET-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|旧配置项目/ });

    await user.click(screen.getByRole("button", { name: "新建初始化" }));
    await user.click(screen.getByRole("button", { name: "生成配置并进入工作台" }));
    await user.click(screen.getByRole("button", { name: /^基础制动机械参数/ }));

    expect(screen.getByRole("button", { name: "踏面制动 tread_cylinder" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await user.click(screen.getByRole("button", { name: "保存" }));
    await user.click(screen.getByRole("button", { name: "确认保存" }));

    const savePayload = vi.mocked(saveConfig).mock.calls.at(-1)?.[0] as
      | { form_state?: Record<string, unknown>; source_input_config_id?: string }
      | undefined;
    const mechParams = ((savePayload?.form_state ?? {}).mech_params ?? {}) as Record<string, unknown>;

    expect(savePayload?.source_input_config_id).toBeUndefined();
    expect(mechParams.cylinder_type).toBe("tread_cylinder");
    expect(mechParams).not.toHaveProperty("Dw");
    expect(mechParams).not.toHaveProperty("Rf");
  });

  it("saves instance display_name and mass_static_override from load-air-spring section", async () => {
    const user = userEvent.setup();

    render(<App />);
    const file = new File(
      [[
        "schema_version: 1",
        "controller_type: bogie",
        "vehicle_config:",
        "  bogies:",
        "    - name: trailer_bogie_1",
        "      bogie_type: trailer_bogie",
        "    - name: powered_bogie_3",
        "      bogie_type: powered_bogie",
        "v0: 80",
        "",
      ].join("\n")],
      "example_override.yaml",
      { type: "text/yaml" }
    );
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "实例称重覆盖项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "OVERRIDE-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|实例称重覆盖项目/ });
    await user.click(screen.getByRole("button", { name: "修订" }));

    await user.click(screen.getByRole("button", { name: /^车辆与控制器配置/ }));
    await user.type(screen.getByRole("textbox", { name: "显示名称 1" }), "1号拖架（司机室端）");
    await user.click(screen.getByRole("checkbox", { name: "实例 1 启用独立称重" }));
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));
    const aw0Inputs = screen.getAllByRole("spinbutton", { name: "AW0 独立称重" });
    const aw2Inputs = screen.getAllByRole("spinbutton", { name: "AW2 独立称重" });
    const aw3Inputs = screen.getAllByRole("spinbutton", { name: "AW3 独立称重" });
    await user.type(aw0Inputs[0], "15.8");
    await user.type(aw2Inputs[0], "22.7");
    await user.type(aw3Inputs[0], "25.6");

    await user.click(screen.getByRole("button", { name: "保存" }));
    await user.click(screen.getByRole("button", { name: "确认保存" }));

    const savePayload = vi.mocked(saveConfig).mock.calls.at(-1)?.[0] as
      | { form_state?: Record<string, unknown> }
      | undefined;
    const vehicleConfig = ((savePayload?.form_state ?? {}).vehicle_config ?? {}) as Record<string, unknown>;
    const bogies = (vehicleConfig.bogies ?? []) as Array<Record<string, unknown>>;

    expect(bogies[0].display_name).toBe("1号拖架（司机室端）");
    expect(bogies[0].mass_static_override).toEqual({ AW0: 15.8, AW2: 22.7, AW3: 25.6 });
  });

  it("prompts before leaving workbench with unsaved changes and respects cancel or confirm", async () => {
    const user = userEvent.setup();

    render(<App />);
    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));
    await user.clear(screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" }));
    await user.type(screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" }), "81");

    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
    expect(screen.getByRole("dialog", { name: "未保存改动" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.getByRole("heading", { level: 2, name: "配置工作台" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
    expect(screen.getByRole("dialog", { name: "未保存改动" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认" }));
    expect(screen.getByRole("button", { name: "新建项目计算" })).toBeInTheDocument();
  });

  it("blocks direct navigation from home to workbench and requires overview revise path", async () => {
    const user = userEvent.setup();

    render(<App />);
    expect(screen.getByRole("button", { name: "配置工作台" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "新建项目计算" })).toBeInTheDocument();

    await openWorkbenchFromHome(user);
    expect(screen.getByRole("heading", { level: 2, name: "配置工作台" })).toBeInTheDocument();
  });

  it("shows readable save confirmation with key-path summary and save status feedback", async () => {
    const user = userEvent.setup();

    render(<App />);
    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));
    await user.clear(screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" }));
    await user.type(screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" }), "82");

    await user.click(screen.getByRole("button", { name: "保存" }));

    const dialog = screen.getByRole("dialog", { name: "保存确认" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("关键变更路径：")).toBeInTheDocument();
    expect(within(dialog).getByText(/v0/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/"name":"FSB"/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确认保存" }));
    expect(await screen.findByText(/保存成功/)).toBeInTheDocument();
  });

  it("triggers one preview-calibration call when switching from disabled to enabled", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^标定/ }));
    await user.click(screen.getByRole("button", { name: "停用标定" }));
    await user.click(screen.getByRole("button", { name: "启用标定" }));

    expect(vi.mocked(runConfig)).not.toHaveBeenCalled();
    expect(vi.mocked(previewCalibration)).toHaveBeenCalledWith("mock-config-id");
    expect(await screen.findByText("BCP0 理论参考值：25 kPa")).toBeInTheDocument();
  });

  it("loads preview-calibration reference when calibration is already enabled", async () => {
    const user = userEvent.setup();
    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "pressure_calibration:",
      "  enabled: true",
      "  service_brake:",
      "    BCP0: 25.0",
      "    point_pair_mode: aw3_aw0",
      "    points:",
      "      - load_group: AW0",
      "        brake_type: FSB",
      "        k_for_code: 1014.0",
      "      - load_group: AW3",
      "        brake_type: FB",
      "        k_for_code: 1204.0",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_enabled_calibration.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "标定回填项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-CAL-ENABLED-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|标定回填项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^标定/ }));

    expect(vi.mocked(previewCalibration)).toHaveBeenCalled();
    expect(await screen.findByText("BCP0 理论参考值：25 kPa")).toBeInTheDocument();
  });

  it("does not offer FB in service calibration brake type when fast brake is disabled", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));
    const fastBrakeToggle = screen.getByRole("checkbox", { name: "启用快速制动" });
    if ((fastBrakeToggle as HTMLInputElement).checked) {
      await user.click(fastBrakeToggle);
    }
    await user.click(screen.getByRole("button", { name: /^标定/ }));
    await user.click(screen.getByRole("button", { name: "启用标定" }));

    const selects = screen.getAllByRole("combobox", { name: "制动类型" });
    await user.click(selects[0]);
    expect(screen.getAllByRole("option", { name: "常用" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("option", { name: "快速" })).not.toBeInTheDocument();
  });

  it("shows warning and auto-adjustment details in result summary", async () => {
    const user = userEvent.setup();
    vi.mocked(runConfig).mockResolvedValueOnce({
      calculation_run_id: "warn-run",
      status: "succeeded",
      report: {
        theoretical_speed_checks: {},
        load_summary: {},
        controller_pressure_standards: {},
        controller_code_params: { pressure_conversion: {} },
        parking_brake_check_result: null,
        parking_brake_check_results_by_load_group: {},
        auto_adjustments: [{ code: "fb_over_eb", message: "FB 压力超过 EB，已自动上调 EB 基值" }],
      },
      warnings: [{ code: "adhesion_clip", message: "黏着约束触发，已按上限裁剪" }],
    });

    render(<App />);
    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: "运行" }));

    expect(await screen.findByRole("heading", { level: 2, name: "运行结果" })).toBeInTheDocument();
    expect(screen.getByText("黏着约束触发，已按上限裁剪")).toBeInTheDocument();
    expect(screen.getByText("FB 压力超过 EB，已自动上调 EB 基值")).toBeInTheDocument();
  });

  it("discards unsaved workbench edits after confirmed leave and reopen", async () => {
    const user = userEvent.setup();

    render(<App />);
    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));
    const v0Input = screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" });
    await user.clear(v0Input);
    await user.type(v0Input, "81");
    expect(v0Input).toHaveValue(81);

    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
    expect(screen.getByRole("dialog", { name: "未保存改动" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认" }));
    expect(screen.getByRole("button", { name: "新建项目计算" })).toBeInTheDocument();

    await openWorkbenchFromHome(user);
    expect(await screen.findByRole("spinbutton", { name: "最高速度 v0 (km/h)" })).not.toHaveValue(81);
  });

  it("updates JSON live, highlights last changed path, and refreshes YAML text after save", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "v0: 80",
      "pressure_calibration:",
      "  enabled: false",
      "parking_brake_check:",
      "  enabled: false",
      ""
    ].join("\n");
    const file = new File([yamlText], "example_live_json.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "联动项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-LIVE-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|联动项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^标定/ }));
    await user.click(screen.getByRole("button", { name: "启用标定" }));

    const highlighted = screen.getByTestId("last-changed-path");
    expect(highlighted).toHaveTextContent("\"enabled\": true");
    expect(highlighted).toHaveStyle({ color: "rgb(198, 69, 50)" });

    await user.click(screen.getByRole("button", { name: "保存" }));
    await user.click(screen.getByRole("button", { name: "确认保存" }));
    await user.click(screen.getByRole("button", { name: "YAML" }));
    expect(screen.getAllByText(/pressure_calibration:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/enabled: true/).length).toBeGreaterThan(0);
  });

  it("calls run API and renders result with backend report after import revise flow", async () => {
    const user = userEvent.setup();
    vi.mocked(runConfig).mockResolvedValueOnce({
      calculation_run_id: "mock-run-id-2",
      status: "succeeded",
      report: {
        theoretical_speed_checks: {
          FSB: {
            "40.0": { beta_used: 1.115, requirement_a_mean: 0.907, theoretical_distance_m: 68.0 },
          },
          EB: {
            "40.0": { beta_used: 1.335, requirement_a_mean: 1.097, theoretical_distance_m: 56.0 },
          },
          FB: {},
        },
        load_summary: {
          AW0: {
            trailer_bogie_1: { mass_dynamic: 16.14, spring_pressure: 250 },
            powered_bogie_3: { mass_dynamic: 17.41, spring_pressure: 212 },
          },
          AW2: {
            trailer_bogie_1: { mass_dynamic: 23.04, spring_pressure: 401 },
          },
          AW3: {
            trailer_bogie_1: { mass_dynamic: 26.14, spring_pressure: 450 },
          },
        },
        controller_pressure_standards: {
          AW0: {
            FSB: { trailer_bogie_1: 210, powered_bogie_3: 210 },
            EB: { trailer_bogie_1: 243, powered_bogie_3: 261 },
            FB: {},
            holding: { trailer_bogie_1: 105, powered_bogie_3: 105 },
            jerk: { trailer_bogie_1: 42, powered_bogie_3: 42 },
          },
          AW2: {
            FSB: { trailer_bogie_1: 317 },
            EB: { trailer_bogie_1: 375 },
            holding: { trailer_bogie_1: 158 },
            jerk: { trailer_bogie_1: 63 },
          },
          AW3: {
            FSB: { trailer_bogie_1: 367 },
            EB: { trailer_bogie_1: 474 },
            holding: { trailer_bogie_1: 184 },
            jerk: { trailer_bogie_1: 73 },
          },
        },
        controller_code_params: {
          pressure_conversion: {
            FSB: { AW0: { trailer_bogie_1: { k_used_for_code: 976, BCP0_used_for_code: 25 } } },
            EB: { AW0: { trailer_bogie_1: { k_used_for_code: 1014, BCP0_used_for_code: 25 } } },
          },
        },
        calibration_summary: {
          service_brake: {
            BCP0_for_code: 25,
            BCP0: 25,
            input_points: [{ load_group: "AW3", k_for_code: 1123 }, { load_group: "AW0", k_for_code: 980 }],
            curve_points: [
              { label: "curve_low", force_kN: 20, k_for_code: 980 },
              { label: "curve_high", force_kN: 31, k_for_code: 1123 },
            ],
            linear_formula_for_code: "k_sb_for_code(f) = 13.000000 * f + 720.000000",
          },
          emergency_brake: {
            BCP0_for_code: 30,
            BCP0: 30,
            input_points: [{ load_group: "AW3", k_for_code: 1204 }, { load_group: "AW0", k_for_code: 1014 }],
            curve_points: [
              { label: "curve_low", force_kN: 24, k_for_code: 1014 },
              { label: "curve_high", force_kN: 34, k_for_code: 1204 },
            ],
            linear_formula_for_code: "k_eb_for_code(f) = 19.000000 * f + 558.000000",
          },
        },
        parking_brake_check_result: {
          per_car: {
            car_1: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 5.0, safety_margin: 4.4 },
            car_2: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 5.0, safety_margin: 4.4 },
          },
          whole_train: { F_PB: 44.0, incline_force: 10.0, safety_margin: 4.4 },
          pass: true,
        },
        parking_brake_check_results_by_load_group: {
          AW0: {
            per_car: {
              car_1: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 5.0, safety_margin: 4.4 },
              car_2: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 5.0, safety_margin: 4.4 },
            },
            whole_train: { F_PB: 44.0, incline_force: 10.0, safety_margin: 4.4 },
            pass: true,
          },
          AW3: {
            per_car: {
              car_1: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 12.0, safety_margin: 1.83 },
              car_2: { F_N_PB: 20.0, F_PB: 22.0, incline_force: 12.0, safety_margin: 1.83 },
            },
            whole_train: { F_PB: 44.0, incline_force: 24.0, safety_margin: 1.83 },
            pass: false,
          },
        },
      },
      warnings: [],
    });

    render(<App />);

    const file = new File(
      [[
        "schema_version: 1",
        "controller_type: bogie",
        "vehicle_config:",
        "  bogies:",
        "    - name: trailer_bogie_1",
        "      bogie_type: trailer_bogie",
        "    - name: powered_bogie_3",
        "      bogie_type: powered_bogie",
        "parking_brake_check:",
        "  enabled: true",
        "  required_safety_margin: 1.2",
        "v0: 80",
        "",
      ].join("\n")],
      "example_run.yaml",
      { type: "text/yaml" }
    );
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "真实运行项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-RUN-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|真实运行项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: "运行" }));

    expect(vi.mocked(runConfig)).toHaveBeenCalledWith("mock-config-id");
    expect(await screen.findByText("44.00 kN")).toBeInTheDocument();
    expect(screen.getByText("40.0 km/h")).toBeInTheDocument();
    expect(screen.getAllByText("trailer_bogie_1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1014").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1204").length).toBeGreaterThan(0);
    expect(screen.queryByText("快速制动")).not.toBeInTheDocument();
    expect(screen.getByText("holding BCP")).toBeInTheDocument();
    expect(screen.getByText("jerk BCP")).toBeInTheDocument();
    expect(screen.getAllByText("AW0").length).toBe(1);
    expect(screen.queryByText(/车控 EB 实际 BCP 压力标定/)).not.toBeInTheDocument();
    expect(screen.getByText(/k_sb_for_code\(f\) = 13\.000000 \* f \+ 720\.000000/)).toBeInTheDocument();
    expect(screen.getByText(/k_eb_for_code\(f\) = 19\.000000 \* f \+ 558\.000000/)).toBeInTheDocument();
    expect(screen.getByText(/f < 20\.00: 980/)).toBeInTheDocument();
    expect(screen.getByText(/f > 31\.00: 1123/)).toBeInTheDocument();
    expect(screen.getByText(/f < 24\.00: 1014/)).toBeInTheDocument();
    expect(screen.getByText(/f > 34\.00: 1204/)).toBeInTheDocument();
    expect(screen.getByLabelText("service_brake 分段曲线示意")).toBeInTheDocument();
    expect(screen.getByLabelText("emergency_brake 分段曲线示意")).toBeInTheDocument();
    expect(screen.getByText("原始计算值（流程输入基值）")).toBeInTheDocument();
    expect(screen.getByText("标定点值")).toBeInTheDocument();
    expect(screen.getByText("最终生效值（标定 + 调整后）")).toBeInTheDocument();
    expect(screen.getByText("常用制动试验点 1（AW3）")).toBeInTheDocument();
    expect(screen.getByText("常用制动试验点 2（AW0）")).toBeInTheDocument();
    expect(screen.getByText("紧急制动试验点 1（AW3）")).toBeInTheDocument();
    expect(screen.getByText("紧急制动试验点 2（AW0）")).toBeInTheDocument();
    expect(screen.getByText("要求防滚余量：1.20")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "按控制器" }));
    const aw0Label = screen.getAllByText("AW0")[0];
    const aw2Label = screen.getAllByText("AW2")[0];
    const aw3Label = screen.getAllByText("AW3")[0];
    expect(
      aw0Label.compareDocumentPosition(aw2Label) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      aw2Label.compareDocumentPosition(aw3Label) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "回到总览" }));
    expect(await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|真实运行项目/ })).toBeInTheDocument();
  });

  it("prefers display_name and shows controller-level dynamic mass formulas in result view", () => {
    render(
      <ResultPage
        report={{
          theoretical_speed_checks: {},
          load_summary: {
            AW0: {
              trailer_bogie_1: { mass_dynamic: 16.14, spring_pressure: 250 },
            },
            AW3: {
              trailer_bogie_1: { mass_dynamic: 26.14, spring_pressure: 450 },
            },
          },
          controller_pressure_standards: {
            AW0: { FSB: { trailer_bogie_1: 210 } },
            AW3: { FSB: { trailer_bogie_1: 367 } },
          },
          controller_code_params: {
            pressure_conversion: {
              FSB: { AW0: { trailer_bogie_1: { k_used_for_code: 976, BCP0_used_for_code: 25 } } },
            },
            dynamic_mass_formula_by_controller: {
              trailer_bogie_1: {
                k: 0.05,
                b: 3.64,
                aw0: { spring_kPa: 250, mass_dyn_t: 16.14 },
                aw3: { spring_kPa: 450, mass_dyn_t: 26.14 },
                formula: "mass_dyn_t = 0.05 * spring_kPa + 3.64",
              },
            },
          },
          parking_brake_check_result: null,
          parking_brake_check_results_by_load_group: {},
        }}
        requiredSafetyMargin={2}
        controllerType="bogie"
        controllerOrder={["trailer_bogie_1"]}
        controllerDisplayNames={{ trailer_bogie_1: "1号拖架（司机室端）" }}
        runtimeStatus="succeeded"
        warnings={[]}
        autoAdjustments={[]}
        pressureMatrixView="load"
        onChangePressureMatrixView={vi.fn()}
        onBackToOverview={vi.fn()}
      />
    );

    expect(screen.getAllByText(/1号拖架（司机室端） \(trailer_bogie_1\)/).length).toBeGreaterThan(0);
    expect(screen.getByText(/mass_dyn_t = 0.050000 \* spring_kPa \+ 3.640000/)).toBeInTheDocument();
  });

  it("shows dash for controller code params when calibration_summary is absent", async () => {
    const user = userEvent.setup();
    vi.mocked(runConfig).mockResolvedValueOnce({
      calculation_run_id: "mock-run-id-3",
      status: "succeeded",
      report: {
        theoretical_speed_checks: {
          FSB: {
            "40.0": { beta_used: 1.115, requirement_a_mean: 0.907, theoretical_distance_m: 68.0 },
          },
        },
        load_summary: {
          AW0: {
            trailer_bogie_1: { mass_dynamic: 16.14, spring_pressure: 250 },
          },
        },
        controller_pressure_standards: {
          AW0: {
            FSB: { trailer_bogie_1: 210 },
          },
        },
        controller_code_params: {
          pressure_conversion: {
            FSB: { AW0: { trailer_bogie_1: { k_used_for_code: 976, BCP0_used_for_code: 25 } } },
            EB: { AW0: { trailer_bogie_1: { k_used_for_code: 1014, BCP0_used_for_code: 25 } } },
          },
        },
        parking_brake_check_result: null,
        parking_brake_check_results_by_load_group: {},
      },
      warnings: [],
    });

    render(<App />);

    const file = new File(
      [[
        "schema_version: 1",
        "controller_type: bogie",
        "vehicle_config:",
        "  bogies:",
        "    - name: trailer_bogie_1",
        "      bogie_type: trailer_bogie",
        "v0: 80",
        "",
      ].join("\n")],
      "example_run_no_calibration_summary.yaml",
      { type: "text/yaml" }
    );
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "无标定摘要项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-RUN-002");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|无标定摘要项目/ });
    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: "运行" }));

    expect(await screen.findByRole("heading", { level: 2, name: "运行结果" })).toBeInTheDocument();
    expect(screen.queryByText("标定点值")).not.toBeInTheDocument();
    expect(screen.queryByText("最终生效值（标定 + 调整后）")).not.toBeInTheDocument();
    expect(screen.getByText("service_brake: -")).toBeInTheDocument();
    expect(screen.getByText("emergency_brake: -")).toBeInTheDocument();
    expect(screen.queryByText("976")).not.toBeInTheDocument();
    expect(screen.queryByText("1014")).not.toBeInTheDocument();
  });

  it("allows editing calibration fields after import and updates JSON highlight", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "pressure_calibration:",
      "  enabled: true",
      "  service_brake:",
      "    BCP0: 25.0",
      "    point_pair_mode: aw3_aw0",
      "    points:",
      "      - load_group: AW0",
      "        brake_type: FSB",
      "        k_for_code: 1014.0",
      "      - load_group: AW3",
      "        brake_type: FB",
      "        k_for_code: 1204.0",
      "",
    ].join("\n");
    const file = new File([yamlText], "example_calibration_editable.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "标定可编辑项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-CAL-EDIT-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|标定可编辑项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^标定/ }));

    const bcp0Input = screen.getByRole("spinbutton", { name: "常用实设出闸压力 BCP0 (kPa)" });
    expect(bcp0Input).toHaveValue(25);
    await user.clear(bcp0Input);
    await user.type(bcp0Input, "31");
    let highlighted = screen.getByTestId("last-changed-path");
    expect(highlighted).toHaveTextContent("\"BCP0\": 31");

    const kInput = screen.getByRole("spinbutton", { name: "常用试验点1 k_for_code" });
    expect(kInput).toHaveValue(1204);
    await user.clear(kInput);
    await user.type(kInput, "1320");

    highlighted = screen.getByTestId("last-changed-path");
    expect(highlighted).toHaveTextContent("\"k_for_code\": 1320");
    expect(highlighted).toHaveStyle({ color: "rgb(198, 69, 50)" });
  });

  it("highlights the emergency calibration point path without colliding with service point key names", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "controller_type: bogie",
      "pressure_calibration:",
      "  enabled: true",
      "  service_brake:",
      "    BCP0: 25.0",
      "    point_pair_mode: aw3_aw0",
      "    points:",
      "      - load_group: AW3",
      "        brake_type: FSB",
      "        k_for_code: 1123.0",
      "      - load_group: AW0",
      "        brake_type: FSB",
      "        k_for_code: 980.0",
      "  emergency_brake:",
      "    BCP0: 25.0",
      "    point_pair_mode: aw3_aw0",
      "    points:",
      "      - load_group: AW3",
      "        brake_type: EB",
      "        k_for_code: 1204.0",
      "      - load_group: AW0",
      "        brake_type: EB",
      "        k_for_code: 1014.0",
      "",
    ].join("\n");
    const file = new File([yamlText], "example_calibration_highlight_collision.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "高亮冲突项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-CAL-HL-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|高亮冲突项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^标定/ }));

    const emergencyPointOneInput = screen.getByRole("spinbutton", { name: "紧急试验点1 k_for_code" });
    await user.clear(emergencyPointOneInput);
    await user.type(emergencyPointOneInput, "1666");

    const highlighted = screen.getByTestId("last-changed-path");
    expect(highlighted).toHaveTextContent("\"k_for_code\": 1666");
  });

  it("does not keep air_spring points in YAML when explicit_linear mode is used", async () => {
    const user = userEvent.setup();

    render(<App />);

    const yamlText = [
      "schema_version: 1",
      "air_spring:",
      "  powered_bogie:",
      "    mode: fitted_from_points",
      "    points:",
      "      - pressure_kpa: 101",
      "        sprung_mass_by_spring_ton: 10.1",
      "      - pressure_kpa: 202",
      "        sprung_mass_by_spring_ton: 20.2",
      "      - pressure_kpa: 303",
      "        sprung_mass_by_spring_ton: 30.3",
      "",
    ].join("\n");
    const file = new File([yamlText], "example_airspring_points_then_linear.yaml", { type: "text/yaml" });
    await user.upload(screen.getByLabelText("上传 YAML 文件"), file);
    await screen.findByRole("heading", { level: 2, name: "导入摘要" });
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "空簧线性保存项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-AS-LINEAR-001");
    await user.click(screen.getByRole("button", { name: "保存并查看总览" }));
    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|空簧线性保存项目/ });

    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));
    await user.click(screen.getByRole("button", { name: "显式线性公式" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    await user.click(screen.getByRole("button", { name: "确认保存" }));
    await user.click(screen.getByRole("button", { name: "YAML" }));

    const yamlPanelText = screen.getAllByText((_, node) => {
      const text = node?.textContent ?? "";
      return text.includes("air_spring:") && text.includes("powered_bogie:");
    })[0]?.textContent ?? "";
    expect(yamlPanelText).toContain("mode: explicit_linear");
    expect(yamlPanelText).not.toContain("powered_bogie:    mode: explicit_linear    points:");
  });

  it("allows adding and deleting custom ratio brake types", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));

    const addButton = screen.getByRole("button", { name: "添加制动类型" });
    await user.click(addButton);
    expect(screen.getByRole("textbox", { name: "制动类型代号 2" })).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: "删除" });
    await user.click(deleteButtons[1]);
    expect(screen.queryByRole("textbox", { name: "制动类型代号 2" })).not.toBeInTheDocument();
  });

  it("allows adding and deleting air spring feature points", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openWorkbenchFromHome(user);
    await user.click(screen.getByRole("button", { name: /^载荷与空簧/ }));
    await user.click(screen.getByRole("button", { name: "特征点拟合" }));

    expect(screen.getByText("特征点 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加特征点" }));
    expect(screen.getByText("特征点 4")).toBeInTheDocument();

    const pointDeleteButtons = screen.getAllByRole("button", { name: "删除" });
    await user.click(pointDeleteButtons[pointDeleteButtons.length - 1]);
    expect(screen.queryByText("特征点 4")).not.toBeInTheDocument();
  });

  it("opens existing project from home buttons and loads readonly overview", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    expect(await screen.findByRole("button", { name: "修订" })).toBeInTheDocument();
    expect(vi.mocked(listProjectVersions)).toHaveBeenCalledWith("SH-HX-026");
    expect(vi.mocked(loadConfig)).toHaveBeenCalledWith("mock-config-id");

    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
    await user.click(screen.getAllByRole("button", { name: "打开" })[1]);
    expect(vi.mocked(openProject)).toHaveBeenCalledWith("CM-PR-011");
  });

  it("opens project version selector and displays version metadata", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    expect(await screen.findByRole("dialog", { name: "打开既有项目" })).toBeInTheDocument();
    expect(screen.getByText("版本")).toBeInTheDocument();
    expect(screen.getByText("生成时间")).toBeInTheDocument();
    expect(screen.getByText("最近运行状态")).toBeInTheDocument();
    expect(screen.getByText("V3")).toBeInTheDocument();
    expect(screen.getAllByText("最近运行成功").length).toBeGreaterThan(0);
    expect(vi.mocked(listProjectVersions)).toHaveBeenCalledWith("SH-HX-026");
  });

  it("paginates project versions with 10 items per page", async () => {
    const user = userEvent.setup();
    vi.mocked(listProjectVersions).mockResolvedValueOnce({
      items: Array.from({ length: 12 }, (_, index) => ({
        input_config_id: `cfg-${index + 1}`,
        version: 40 - index,
        created_at: "2026-04-30T12:00:00Z",
        latest_run: null,
      })),
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    expect(await screen.findByText("第 1 / 2 页")).toBeInTheDocument();
    expect(screen.getByText("V40")).toBeInTheDocument();
    expect(screen.queryByText("V30")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.getByText("第 2 / 2 页")).toBeInTheDocument();
    expect(screen.getByText("V30")).toBeInTheDocument();
  });

  it("allows editing wizard project metadata fields", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "新建初始化" }));

    const projectName = screen.getByRole("textbox", { name: "项目名称" });
    const projectCode = screen.getByRole("textbox", { name: "项目编号" });
    const projectEmail = screen.getByRole("textbox", { name: "报告获取邮箱" });
    const projectNote = screen.getByRole("textbox", { name: "备注（非必填）" });
    await user.type(projectName, "项目A");
    await user.type(projectCode, "CODE-A");
    await user.type(projectEmail, "ops@example.com");
    await user.type(projectNote, "note");
    expect(projectName).toHaveValue("项目A");
    expect(projectCode).toHaveValue("CODE-A");
    expect(projectEmail).toHaveValue("ops@example.com");
    expect(projectNote).toHaveValue("note");
  });

  it("reflects succeeded run status on overview and keeps result view available", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    await screen.findByRole("button", { name: "修订" });
    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: "运行" }));
    await screen.findByRole("heading", { level: 2, name: "运行结果" });
    await user.click(screen.getByRole("button", { name: "回到总览" }));
    await screen.findByRole("button", { name: "修订" });
    expect(screen.getByRole("button", { name: "查看结果" })).toBeEnabled();
  });

  it("refreshes home project list when returning to home from overview", async () => {
    const user = userEvent.setup();
    render(<App />);

    const initialCalls = vi.mocked(listProjects).mock.calls.length;
    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    await screen.findByRole("button", { name: "修订" });
    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));

    expect(vi.mocked(listProjects).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it("keeps the previously loaded real project list when returning home refresh fails", async () => {
    const user = userEvent.setup();
    vi.mocked(listProjects)
      .mockResolvedValueOnce({
        items: [
          {
            project_name: "成都30号线",
            project_code: "TKQ604X",
            updated_at: "2026-05-14T10:00:00Z",
            latest_input_config_id: "cfg-chengdu",
            controller_type: "bogie",
            latest_run: null,
          },
          {
            project_name: "北京11号线",
            project_code: "TKQ604J",
            updated_at: "2026-05-14T09:00:00Z",
            latest_input_config_id: "cfg-beijing",
            controller_type: "car",
            latest_run: null,
          },
        ],
      })
      .mockRejectedValueOnce(new Error("network_failed"));

    render(<App />);

    expect(await screen.findByText("成都30号线 / TKQ604X")).toBeInTheDocument();
    expect(screen.getByText("北京11号线 / TKQ604J")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "打开" })[0]);
    await screen.findByRole("button", { name: "修订" });
    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));

    expect(await screen.findByText("成都30号线 / TKQ604X")).toBeInTheDocument();
    expect(screen.getByText("北京11号线 / TKQ604J")).toBeInTheDocument();
    expect(screen.queryByText("上海机场线制动项目 / SH-HX-026")).not.toBeInTheDocument();
    expect(screen.queryByText("崇明线预研项目 / CM-PR-011")).not.toBeInTheDocument();
  });

  it("downloads YAML from workbench", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window.URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock-url"),
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    await screen.findByRole("button", { name: "修订" });
    await user.click(screen.getByRole("button", { name: "修订" }));
    await user.click(screen.getByRole("button", { name: "下载 YAML" }));
    expect(vi.mocked(downloadYaml)).toHaveBeenCalledWith("mock-config-id");
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it("rehydrates latest run from persisted record when reopening project", async () => {
    const user = userEvent.setup();
    vi.mocked(loadConfig).mockResolvedValueOnce({
      project: {
        project_name: "上海机场线制动项目",
        project_code: "SH-HX-026",
        email: null,
        note: "",
      },
      yaml_text: "schema_version: 1\nv0: 80\n",
      form_state: { schema_version: 1, v0: 80 },
      validation_status: "valid",
      errors: [],
      version: 3,
      source_input_config_id: null,
      revision_reason: null,
      latest_run: {
        calculation_run_id: "run-persisted",
        status: "succeeded",
        report: {
          parking_brake_check_result: null,
          parking_brake_check_results_by_load_group: {},
          theoretical_speed_checks: {},
          load_summary: {},
          controller_pressure_standards: {},
          controller_code_params: { pressure_conversion: {} },
        },
        created_at: "2026-04-30T12:00:00Z",
      },
    });
    vi.mocked(openProject).mockResolvedValueOnce({
      input_config_id: "mock-config-id",
      config: {
        project: {
          project_name: "上海机场线制动项目",
          project_code: "SH-HX-026",
          email: null,
          note: "",
        },
        yaml_text: "schema_version: 1\nv0: 80\n",
        form_state: { schema_version: 1, v0: 80 },
        validation_status: "valid",
        errors: [],
        version: 3,
        source_input_config_id: null,
        revision_reason: null,
        latest_run: {
          calculation_run_id: "run-persisted",
          status: "succeeded",
          report: {
            parking_brake_check_result: null,
            parking_brake_check_results_by_load_group: {},
            theoretical_speed_checks: {},
            load_summary: {},
            controller_pressure_standards: {},
            controller_code_params: { pressure_conversion: {} },
          },
          created_at: "2026-04-30T12:00:00Z",
        },
      },
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "打开既有项目" }));
    await user.click(await screen.findByRole("button", { name: "打开选中版本" }));
    await screen.findByRole("button", { name: "查看结果" });
    await user.click(screen.getByRole("button", { name: "查看结果" }));
    expect(await screen.findByRole("heading", { level: 2, name: "运行结果" })).toBeInTheDocument();
  });
});


