import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { App } from "./App";

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
    loadConfig: vi.fn(async () => {
      if (savedConfig === null) {
        return null;
      }
      return savedConfig;
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
    })
  };
});

describe("App shell", () => {
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

    await user.click(screen.getByRole("button", { name: "只读总览" }));
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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
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
    expect(screen.getByRole("heading", { level: 2, name: "运行结果" })).toBeInTheDocument();
  });

  it("renders the load and air spring form slice inside the workbench", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "配置工作台" }));

    expect(screen.getByRole("heading", { level: 3, name: "车辆载荷参数录入" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "转向架参数录入" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "空簧特性输入" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按整车录入（推荐）" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按转向架录入" })).toBeInTheDocument();
    expect(screen.getAllByText(/动车称重（整车）/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/拖车称重（整车）/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "质量单位：ton" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "质量单位：kN（前端辅助换算）" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "特征点拟合" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "显式线性公式" })).toBeInTheDocument();
  });

  it("switches the air spring input mode between fitted points and explicit linear formula", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "配置工作台" }));

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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));

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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
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
    expect(screen.getByRole("button", { name: "启用快速制动" })).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    await user.click(screen.getByRole("button", { name: /^标定/ }));

    expect(screen.getByRole("heading", { level: 3, name: "标定" })).toBeInTheDocument();
    expect(screen.getByText(/本页录入的是试验点驱动的实设系数/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "常用控制系数标定" })).toBeInTheDocument();
    expect(screen.getByText("当前状态：未配置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AW3-AW0 模式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AW3-AW2 模式" })).toBeInTheDocument();
    expect(screen.getByText("实设出闸压力")).toBeInTheDocument();
    expect(screen.getAllByText("理论参考值").length).toBeGreaterThan(0);
    expect(screen.getByText("试验点 1（AW3）")).toBeInTheDocument();
    expect(screen.getByText("试验点 2（AW0）")).toBeInTheDocument();
    expect(screen.getAllByText("制动类型").length).toBeGreaterThan(0);
    expect(screen.getAllByText("实设控制系数 k_for_code").length).toBeGreaterThan(0);
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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));

    expect(screen.queryByRole("button", { name: /^电空计算/ })).not.toBeInTheDocument();
  });

  it("renders the result page with summary, performance checks, pressure matrix and controller params", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "结果页" }));

    expect(screen.getByRole("heading", { level: 2, name: "运行结果" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回配置" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "回到总览" })).toBeInTheDocument();
    expect(screen.getByText("运行状态 / 最后一次运行时间")).toBeInTheDocument();
    expect(screen.getByText("警告")).toBeInTheDocument();
    expect(screen.getByText("自动调整")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "制动性能检查" })).toBeInTheDocument();
    expect(screen.getByText("初速度 (km/h)")).toBeInTheDocument();
    expect(screen.getAllByText("最大常用制动").length).toBeGreaterThan(0);
    expect(screen.getAllByText("控制减速度").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("平均减速度").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("制动距离").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("100 km/h")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "压力矩阵" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按载荷类型" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按控制器" })).toBeInTheDocument();
    expect(screen.getByText("动态载荷 mass_dyn_t (ton)")).toBeInTheDocument();
    expect(screen.getByText("标准空簧压力 spring_kPa")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "按控制器" }));
    expect(screen.getAllByText("AW0 / mass_dyn_t").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AW3 / spring_kPa").length).toBeGreaterThan(0);

    expect(screen.getByRole("heading", { level: 3, name: "控制器开发参数" })).toBeInTheDocument();
    expect(screen.getByText("常用制动 k_for_code")).toBeInTheDocument();
    expect(screen.getByText("常用制动 BCP0_for_code")).toBeInTheDocument();
    expect(screen.getByText("紧急制动 k_for_code")).toBeInTheDocument();
    expect(screen.getByText("紧急制动 BCP0_for_code")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "标定摘要" })).toBeInTheDocument();
    expect(screen.getByText("常用制动 k_for_code 分段曲线")).toBeInTheDocument();
    expect(screen.getByText("紧急制动 k_for_code 分段曲线")).toBeInTheDocument();
    expect(screen.getByText(/车控 EB 实际 BCP 压力标定 V1.0 暂不支持/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "停放校核结果" })).toBeInTheDocument();
    expect(screen.getByText("F_N_PB 单个制动单元双侧作用力")).toBeInTheDocument();
    expect(screen.getByText("F_PB 每车停放制动力")).toBeInTheDocument();
    expect(screen.getByText("全列停放制动力")).toBeInTheDocument();
    expect(screen.getByText("最恶劣工况下的倾斜力")).toBeInTheDocument();
    expect(screen.getByText("要求防滚余量：2.00")).toBeInTheDocument();
    expect(screen.getByText("1车")).toBeInTheDocument();
    expect(screen.getByText("2车")).toBeInTheDocument();
    expect(screen.getByText("全列合计")).toBeInTheDocument();
    expect(screen.getByText("全列防滚余量")).toBeInTheDocument();
    expect(screen.getByText("单车停放制动力")).toBeInTheDocument();
    expect(screen.getByText("AW0 单车倾斜力")).toBeInTheDocument();
    expect(screen.getByText("AW3 单车倾斜力")).toBeInTheDocument();
    expect(screen.queryByText("AW2 单车倾斜力")).not.toBeInTheDocument();
    expect(screen.getByText("要求防滚余量：2.00")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1.67" })).toHaveStyle({
      color: "rgb(198, 69, 50)",
      fontWeight: "700"
    });
  });

  it("renders the import summary page with supplement recognition, warnings and run readiness", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "导入摘要" }));

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
    expect(screen.getByRole("button", { name: "查看总览" })).toBeInTheDocument();
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
      screen.getByRole("heading", { level: 2, name: /上海机场线制动项目/ })
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

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    expect(screen.getByRole("textbox", { name: "AW0 / 动车称重（整车）" })).toHaveValue("15.83");
    expect(screen.getByRole("textbox", { name: "AW0 / 拖车称重（整车）" })).toHaveValue("15.37");
    expect(screen.getByRole("textbox", { name: "AW3 / 动车称重（整车）" })).toHaveValue("26.37");
    expect(screen.getByRole("textbox", { name: "AW3 / 拖车称重（整车）" })).toHaveValue("25.18");
    expect(screen.getByRole("textbox", { name: "动车转向架重量 bogie_weight (ton)" })).toHaveValue("6.3");
    expect(screen.getByRole("textbox", { name: "拖车转向架重量 bogie_weight (ton)" })).toHaveValue("4.1");

    await user.click(screen.getByRole("button", { name: "显式线性公式" }));
    expect(screen.getByRole("textbox", { name: "空簧线性系数 k (kPa/ton)" })).toHaveValue("43.69");
    expect(screen.getByRole("textbox", { name: "空簧截距 b (kPa)" })).toHaveValue("4.13");
  });

  it("navigates from overview supplement cards into targeted workbench sections", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "只读总览" }));
    await user.click(screen.getAllByRole("button", { name: "点击补录" })[0]);
    expect(screen.getByRole("heading", { level: 3, name: "停放校核" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "返回总览" }));
    await user.click(screen.getAllByRole("button", { name: "点击补录" })[1]);
    expect(screen.getByRole("heading", { level: 3, name: "标定" })).toBeInTheDocument();
  });

  it("opens workbench when clicking revise from overview", async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "只读总览" }));
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

    await screen.findByRole("heading", { level: 2, name: /上海机场线制动项目|导入项目/ });
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
    const massInputs = screen.getAllByRole("textbox", { name: "质量 (ton)" });
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
    await user.click(screen.getByRole("button", { name: "启用 pressure_calibration" }));
    expect(screen.getByText("当前状态：已配置")).toBeInTheDocument();
  });

  it("disables wizard entry after import while keeping home entry available", async () => {
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

    expect(screen.getByRole("button", { name: "新建初始化" })).toBeDisabled();
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
    await user.click(screen.getByRole("button", { name: "启用 parking_brake_check" }));
    expect(screen.getByText("当前状态：已补充停放校核")).toBeInTheDocument();
  });

  it("prompts before leaving workbench with unsaved changes and respects cancel or confirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    confirmSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);

    render(<App />);
    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));
    await user.clear(screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" }));
    await user.type(screen.getByRole("spinbutton", { name: "最高速度 v0 (km/h)" }), "81");

    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 2, name: "配置工作台" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "首页 / 项目列表" }));
    expect(screen.getByRole("button", { name: "新建项目计算" })).toBeInTheDocument();

    confirmSpy.mockRestore();
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
    await user.click(screen.getByRole("button", { name: "启用 pressure_calibration" }));

    const highlighted = screen.getByTestId("last-changed-path");
    expect(highlighted).toHaveTextContent("\"enabled\": true");
    expect(highlighted).toHaveStyle({ color: "rgb(198, 69, 50)" });

    await user.click(screen.getByRole("button", { name: "保存" }));
    await user.click(screen.getByRole("button", { name: "YAML" }));
    expect(screen.getAllByText(/pressure_calibration:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/enabled: true/).length).toBeGreaterThan(0);
  });
});
