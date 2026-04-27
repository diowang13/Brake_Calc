export type ScreenKey =
  | "home"
  | "wizard"
  | "overview"
  | "workbench"
  | "result"
  | "import-summary";

export type Screen = {
  key: ScreenKey;
  label: string;
  heading: string;
  description: string;
};

export const screens: Screen[] = [
  {
    key: "home",
    label: "首页 / 项目列表",
    heading: "开始你的制动计算",
    description: "首页承接新建项目计算和打开既有项目两条主路径。"
  },
  {
    key: "wizard",
    label: "新建初始化",
    heading: "新建设计项目",
    description: "两步初始化向导用于先确定项目基础信息和初始化配置。"
  },
  {
    key: "overview",
    label: "只读总览",
    heading: "上海机场线制动项目 / SH-HX-026",
    description: "已运行成功版本默认进入只读总览，并区分补录与修订。"
  },
  {
    key: "workbench",
    label: "配置工作台",
    heading: "配置工作台",
    description: "工作台采用左导航、中间章节、右侧说明的三栏骨架。"
  },
  {
    key: "result",
    label: "结果页",
    heading: "运行结果",
    description: "结果页先看摘要和制动性能检查，再看压力矩阵。"
  },
  {
    key: "import-summary",
    label: "导入摘要",
    heading: "导入摘要",
    description: "导入 YAML 后先看摘要，再决定进入工作台还是总览。"
  }
];
