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

  it("renders the base brake mechanical slice with unit hints and parking boundary", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    await user.click(screen.getByRole("button", { name: /^基础制动机械参数/ }));

    expect(screen.getByRole("heading", { level: 3, name: "基础制动机械参数" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "基础制动缸参数" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "条件显示项" })).toBeInTheDocument();
    expect(screen.getAllByText("单位提示").length).toBeGreaterThan(0);
    expect(screen.getByText(/停放缸参数不在本章/)).toBeInTheDocument();
    expect(screen.getByText("制动缸缸径 (mm)")).toBeInTheDocument();
    expect(screen.getByText("杠杆比 Lpi / Lo")).toBeInTheDocument();
  });

  it("renders the parking brake supplement slice with status, environment and mechanics", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "配置工作台" }));
    await user.click(screen.getByRole("button", { name: /^停放校核/ }));

    expect(screen.getByRole("heading", { level: 3, name: "停放校核" })).toBeInTheDocument();
    expect(screen.getByText("当前状态：未补充停放校核")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "环境条件" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "机械参数" })).toBeInTheDocument();
    expect(screen.getByText("AW0 坡度 (‰)")).toBeInTheDocument();
    expect(screen.getByText("AW3 坡度 (‰)")).toBeInTheDocument();
    expect(screen.getByText("停放缸作用力 (kN)")).toBeInTheDocument();
    expect(screen.getByText("停放制动单元数量 (-)")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { level: 3, name: "压力矩阵" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按载荷类型" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按控制器" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "控制器开发参数" })).toBeInTheDocument();
    expect(screen.getByText("常用制动开发参数")).toBeInTheDocument();
    expect(screen.getByText("紧急制动开发参数")).toBeInTheDocument();
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
