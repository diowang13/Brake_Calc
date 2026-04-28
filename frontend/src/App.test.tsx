import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./App";

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
    expect(screen.getByRole("button", { name: "导入 YAML" })).toBeInTheDocument();
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
    expect(screen.getAllByRole("button", { name: "点击补录" }).length).toBe(3);
    expect(screen.getByText("最后一次运行")).toBeInTheDocument();
    expect(screen.getByText("警告与自动调整")).toBeInTheDocument();
    expect(screen.getByText("停放校核状态")).toBeInTheDocument();

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

  it("renders the technical conditions slice with business labels and brake type controls", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));

    expect(screen.getByRole("heading", { level: 3, name: "运行基础配置 / 技术条件" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "最大常用制动" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "紧急制动" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "快速制动" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "其他比例制动" })).toBeInTheDocument();
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
    expect(screen.getByText("制动类型代号 name（写入 YAML）")).toBeInTheDocument();
    expect(screen.getByText("相对最大常用制动比例 ratio (-)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加比例制动类型" })).toBeInTheDocument();
    expect(screen.getByText("黏着利用限制 mu_limit (-)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "按制动距离录入" }));

    expect(screen.getByText("紧急制动距离要求 (m)")).toBeInTheDocument();
    expect(screen.queryByText("紧急制动平均减速度要求 (m/s²)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加待校核速度" }));

    expect(screen.getByText("待校核速度 1 (km/h)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加比例制动类型" }));

    expect(screen.getByText("制动类型代号 2 name（写入 YAML）")).toBeInTheDocument();
    expect(screen.getByText("相对最大常用制动比例 2 ratio (-)")).toBeInTheDocument();
  });

  it("uses ratio brake defaults and validates ratio brake names and percentage inputs", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    await user.click(screen.getByRole("button", { name: /^运行基础配置 \/ 技术条件/ }));

    const firstNameInput = screen.getByRole("textbox", {
      name: "制动类型代号 name（写入 YAML）"
    });
    const firstRatioInput = screen.getByRole("spinbutton", {
      name: "相对最大常用制动比例 ratio (-)"
    });

    expect(firstNameInput).toHaveValue("holding");
    expect(firstRatioInput).toHaveValue(50);
    expect(screen.getAllByText("%").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "添加比例制动类型" }));

    expect(
      screen.getByRole("textbox", { name: "制动类型代号 2 name（写入 YAML）" })
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

  it("renders the calibration supplement slice grouped by load cases", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    await user.click(screen.getByRole("button", { name: /^标定/ }));

    expect(screen.getByRole("heading", { level: 3, name: "标定" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "AW3-AW0 工况" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "AW3-AW2 工况" })).toBeInTheDocument();
    expect(screen.getByText("当前状态：已完成 aw3_aw0 首轮标定")).toBeInTheDocument();
    expect(screen.getByText("当前状态：待补充 aw3_aw2 标定")).toBeInTheDocument();
    expect(screen.getAllByText("常用制动试验点表").length).toBeGreaterThan(0);
    expect(screen.getAllByText("紧急制动试验点表").length).toBeGreaterThan(0);
  });

  it("renders the electric brake supplement slice with curve area and point table", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    await user.click(screen.getByRole("button", { name: /^电空计算/ }));

    expect(screen.getByRole("heading", { level: 3, name: "电制动特性" })).toBeInTheDocument();
    expect(screen.getByText("当前仅做输入补录和摘要展示，不参与 V1 主制动计算。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "电制动曲线" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "特性点表" })).toBeInTheDocument();
    expect(screen.getAllByText("速度 (km/h)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("电制动力 (kN)").length).toBeGreaterThan(0);
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
    expect(screen.getByText("whole_train 整列汇总力")).toBeInTheDocument();
    expect(screen.getAllByText("AW0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AW3").length).toBeGreaterThan(0);
  });

  it("renders the import summary page with supplement recognition, warnings and run readiness", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "导入摘要" }));

    expect(screen.getByRole("heading", { level: 2, name: "导入摘要" })).toBeInTheDocument();
    expect(screen.getByText("是否包含停放校核 / 标定 / electric_brake 等后置内容")).toBeInTheDocument();
    expect(screen.getByText("是否存在导入警告")).toBeInTheDocument();
    expect(screen.getByText("是否可直接运行")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入工作台" })).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "进入工作台" }));
    expect(screen.getByRole("heading", { level: 2, name: "配置工作台" })).toBeInTheDocument();
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
});
