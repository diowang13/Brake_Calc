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

    expect(screen.getByRole("heading", { level: 2, name: "导入摘要" })).toBeInTheDocument();
    expect(screen.getByText("是否包含停放校核 / 标定 / electric_brake 等后置内容")).toBeInTheDocument();
    expect(screen.getByText("是否存在导入警告")).toBeInTheDocument();
    expect(screen.getByText("是否可直接运行")).toBeInTheDocument();
    expect(screen.getByText("导入 YAML 不包含项目元数据，请先补全后再保存为配置版本。")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "项目名称" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "项目编号" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "导入 YAML 文本" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入工作台" })).toBeDisabled();
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
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "导入项目");
    await user.type(screen.getByRole("textbox", { name: "项目编号" }), "IMP-001");
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
