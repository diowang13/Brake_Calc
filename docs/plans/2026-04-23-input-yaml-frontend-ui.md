# input.yaml 前端 UI 实施计划

> **给执行 agent 的要求：** 按本计划逐项执行时，必须使用 `superpowers:executing-plans` 技能。

**目标：** 做一个中文网页配置界面，让操作人员不用手写 YAML，也能生成符合 brake-calc 当前 `Inputs` 契约的 `input.yaml`。

**架构：** 前端采用“配置工作台”形态：左侧步骤导航，中间表单区，右侧固定显示 S1 校验结果和 YAML 预览。前端维护一套面向用户的 FormState，再序列化成后端 `Inputs` 需要的 YAML 结构。项目名称、TKQ/项目代号、邮箱等元数据不写入 `input.yaml`，后续交给持久化层保存。

**技术栈：** 推荐 React + TypeScript + Vite。前端需要类型化 FormState、YAML 序列化、以及调用后端 S1/`Inputs` 校验。当前仓库还没有前端目录，且 `AGENTS.md` 不建议擅自新增顶层目录，所以实现前要先确认前端放置位置。

---

## V1 对齐说明

本计划已被 [2026-04-24-v1-contract-and-feature-upgrade.md](/D:/codeX/Brake_Calc_Agent/Brake_Calc/docs/plans/2026-04-24-v1-contract-and-feature-upgrade.md) 补充和约束。后续正式实施时，以 V1 计划中的字段结构和功能边界为准；本计划负责前端 UI 拆解和交互形态。

对齐后请注意，以下旧结论已经失效：

- 不再是“只支持架控”，V1 需要支持 `bogie` 和 `car`
- 停放制动力校核不再是预留，而是 V1 active scope
- `caliper_cylinder` 不再是未来项，而是 V1 active scope
- 标定页面不再以“直接编辑 k_segments”为主，而是改成“试验点驱动”
- 需要新增 FB、黏着限制、电制动识别摘要和自动调整提示

建议你在阅读本计划时，把以下页面部分按 V1 理解：

- 页面 3：增加 FB 勾选和 `response_time.FB`
- 页面 4：增加车控 `cars[]`
- 页面 6：增加 `caliper_cylinder`、停放制动力校核、`adhesion.mu_limit`、电制动上传识别摘要
- 页面 7：标定结构改成 `service_brake` / `emergency_brake` 试验点输入

---

## 范围

本计划只覆盖“生成 `input.yaml` 的前端 UI 和交互设计”。

包含：
- 当前 `src/brake_calc/contracts/inputs.py` 中所有 YAML 字段的中文表单。
- 项目元数据字段，为后续 SQLite 持久化做准备。
- FormState 设计和 YAML 序列化规则。
- 只读 YAML 预览。
- S1 校验结果展示区域。
- 导入已有 YAML。
- 导出 YAML 文件名规则。

不包含：
- SQLite 表结构和持久化实现。
- 后端 API 实现。
- 运行制动计算 workflow。
- 邮件发送。
- 车控后端能力。
- 停放制动力校核。

这些内容分别放到后续计划：
- `docs/plans/2026-04-23-input-yaml-sqlite-storage.md`
- `docs/plans/2026-04-23-input-yaml-backend-api.md`

## 已确认的产品决策

- 采用方案 C：左侧步骤导航 + 中间表单 + 右侧校验/YAML 预览。
- UI 使用中文，生成的 YAML key 仍使用英文。
- 项目名称、TKQ/项目代号、邮箱不写入 `input.yaml`。
- 最终产品目标是云端部署：外网可访问的 Web UI 生成 YAML，将项目和配置记录存入专门 SQL 数据库，Hermes 作为 skill/tool 调用后端 brake-calc 计算能力。
- 邮箱后续用于云端自动发送计算报告。
- MVP 生成的 YAML 只支持架控。
- UI 中有“控制网段编组数量”字段。架控时，生成转向架数量 = `控制网段编组数量 * 2`。
- 例如控制网段编组数量为 `3`，界面生成 `bogie1` 到 `bogie6`，YAML 序列化为 6 条 `vehicle_config.bogies`。
- 车控作为未来能力在界面上预留/禁用，后端支持前不序列化。
- AW0/AW2/AW3 固定存在，三种静态称重数据都必须填写。
- `pressure_calibration.enabled = false` 时，标定界面禁用，不允许填写。
- AW2 标定默认隐藏，后续可通过标定区域的 `+` 增加。
- 载荷配置中必须展示动架和拖架各自的转向架自重。
- 静摩擦系数可作为后续停放制动力校核预留字段展示，但当前不写入 YAML。

## 目标云端工作流

前端是后续云端流程中面向操作人员的入口：

```text
操作人员 Web UI
  -> 生成并校验 input.yaml
  -> 将项目元数据 + YAML/配置版本保存到 SQL
  -> Hermes agent/tool 读取已保存配置，或接收 config id
  -> 后端 import brake_calc.workflow.runner 并运行计算
  -> 后端保存报告/结果
  -> 云端自动化按已保存邮箱发送报告
```

这对前端的要求：
- 项目元数据和 `input.yaml` 必须分开。
- `projectCode`/TKQ 是长期检索字段，也是导出文件名前缀。
- YAML 生成必须稳定、可复现，方便 Hermes/backend 重跑。
- 保存足够的 UI 状态，后续能重新打开并编辑配置。
- 浏览器端不能依赖本地 CLI 命令。

## 前端文件位置建议

当前仓库还没有前端 app。因为 `AGENTS.md` 说不要擅自新增顶层目录，实施前要确认以下位置之一：

- 推荐，需明确批准：`frontend/`
- 放在 Python package 内：`src/brake_calc/ui/`
- 只做文档/静态原型：`docs/ui-prototype/`

批准后推荐结构：

```text
frontend/
  package.json
  index.html
  src/
    app/
      App.tsx
      routes.tsx
    features/input-yaml/
      components/
      model/
      serialization/
      validation/
      InputYamlWorkbench.tsx
    styles/
```

实施前不要创建这些文件。

---

## FormState 模型

前端不应该直接把表单数据存成 YAML 字符串，而是维护类型化 FormState，再序列化到后端 `Inputs` 结构。

建议顶层结构：

```ts
type InputYamlFormState = {
  project: ProjectMetadataState;
  run: RunConfigState;
  braking: BrakingConfigState;
  vehicle: VehicleControllerState;
  load: LoadAndAirSpringState;
  baseBrake: BaseBrakeState;
  calibration: PressureCalibrationState;
};
```

项目元数据，不写入 YAML：

```ts
type ProjectMetadataState = {
  projectName: string;
  projectCode: string;
  email: string;
  note?: string;
};
```

会生成 YAML 的部分示例：

```ts
type RunConfigState = {
  v0Kmh: number | null;
  checkSpeedsKmh: number[];
  loadGroups: ["AW0", "AW2", "AW3"];
  allocationStrategy: "equal_wear" | "equal_adhesion";
  ebLimitMinKpa: number | null;
};

type VehicleControllerState = {
  controlMode: "bogie";
  controlSectionCount: number | null;
  bogies: Array<{
    uiName: string;
    yamlName: string;
    bogieType: "powered_bogie" | "trailer_bogie";
  }>;
};
```

具体 TypeScript 类型在实施时写，本计划只固定形状和映射规则。

---

## 页面布局

### 全局工作台

左侧导航：
- 项目基础信息
- 运行基础配置
- 制动需求配置
- 车辆与控制器配置
- 载荷与空簧配置
- 基础制动配置
- 试验标定配置
- 校验与导出

中间区域：
- 当前步骤表单。
- 区域标题。
- 字段单位。
- 字段 hover 提示词。

右侧区域：
- S1 校验结果
- YAML 预览
- 导入/导出操作

右侧行为：
- YAML 预览 MVP 阶段只读。
- S1 校验错误显示在独立提示框里，对应你的原型设想。
- 如果错误能映射到字段，点击错误应定位到对应输入项。

---

## 页面 1：项目基础信息

用途：收集后续持久化和云端邮件发送需要的元数据。

| UI 字段 | 保存目标 | 写入 YAML | 控件 |
| --- | --- | --- | --- |
| 项目名称 | SQLite 项目元数据 | 否 | 文本框 |
| 项目代号 / TKQ | SQLite 项目元数据、导出文件名 | 否 | 文本框 |
| 邮箱 | SQLite 项目元数据、后续邮件发送 | 否 | 邮箱输入 |
| 备注 | SQLite 项目元数据 | 否 | 多行文本 |

校验：
- 保存时项目名称必填。
- 保存/导出时项目代号必填。
- 邮箱 MVP 可选；如果填写，必须符合邮箱格式。

提示词示例：
- 项目代号 / TKQ：“用于检索配置和生成导出文件名，不写入 input.yaml。”
- 邮箱：“后续云端计算完成后发送报告使用，不写入 input.yaml。”

---

## 页面 2：运行基础配置

用途：配置顶层运行参数和全局分配策略。

| UI 字段 | YAML 字段 | 控件 |
| --- | --- | --- |
| 最高速度 | `v0` | 数字输入，单位 `km/h` |
| 速度向量 | `V_list` | 可增删数字标签，单位 `km/h` |
| 载荷组 | `load_groups` | 固定勾选 AW0/AW2/AW3 |
| 常用制动力分配方式 | `allocation_strategy` | 下拉：等磨耗 / 等黏着 |
| 紧急制动最小压力 | `EB_limit_min` | 数字输入，单位 `kPa` |

规则：
- `load_groups` 始终为 `["AW0", "AW2", "AW3"]`。
- 界面要说明：EB 总是强制等黏着，不受 `allocation_strategy` 影响。
- `V_list` 可以为空；为空时序列化为省略或 `null`，具体以后端偏好为准。

校验：
- `v0 > 0`
- `V_list` 每个值 `> 0`
- `EB_limit_min >= 0`

---

## 页面 3：制动需求配置

用途：定义 FSB、EB 和可选的 FSB 百分比制动类型。

| UI 字段 | YAML 字段 | 控件 |
| --- | --- | --- |
| FSB 制动类型 | `brake_types[].name/source` | 锁定行 |
| EB 制动类型 | `brake_types[].name/source` | 锁定行 |
| 自定义制动类型 | `brake_types[]` | 可增删行 |
| 自定义类型名称 | `brake_types[].name` | 文本框 |
| FSB 百分比 | `brake_types[].ratio` | 百分比数字输入 |
| FSB 技术条件 | `requirement.FSB` | 固定 `a_mean`，数字输入，单位 `m/s^2` |
| EB 技术条件 | `requirement.EB` | 单选 `a_mean` / `distance`，数字输入 |
| FSB 空走时间 | `response_time.FSB.t1` | 数字输入，单位 `s` |
| FSB 冲击率 | `response_time.FSB.impulse_rate` | 数字输入，单位 `m/s^3` |
| EB 空走时间 | `response_time.EB.t1` | 数字输入，单位 `s` |
| EB 建立时间 | `response_time.EB.t2` | 数字输入，单位 `s` |

映射：
- UI 中 `50%` 序列化为 `ratio: 0.5`。
- FSB 序列化为 `{name: "FSB", source: "kinematic"}`。
- EB 序列化为 `{name: "EB", source: "kinematic"}`。
- 自定义行序列化为 `{name, source: "ratio_of_FSB", ratio}`。

校验：
- FSB 和 EB 不能删除。
- 自定义名称不能与 FSB、EB 或其他自定义名称重复。
- 自定义 ratio 必须 `> 0`。
- FSB requirement 固定为 `a_mean`。
- requirement 值必须 `> 0`。
- `FSB.t1 >= 0`
- `FSB.impulse_rate > 0`
- `EB.t1 >= 0`
- `EB.t2 > 0`

---

## 页面 4：车辆与控制器配置

用途：为当前架控 MVP 生成 controller/bogie 映射。

| UI 字段 | YAML 字段 | 控件 |
| --- | --- | --- |
| 控制方式 | `controller_type` | 分段控件；架控启用，车控禁用/预留 |
| 控制网段编组数量 | UI 派生字段 | 整数输入/步进器 |
| 每 controller 转向架数 | `n_bogies_by_controller` | 只读 `1` |
| 每 controller 空簧数 | `n_springs_by_controller` | 只读 `2` |
| 每 controller 制动缸数 | `n_cylinders_by_controller` | 只读 `4` |
| 转向架列表 | `vehicle_config.bogies` | 根据控制网段编组数量生成表格 |
| 转向架类型 | `vehicle_config.bogies[].bogie_type` | 下拉：动架 / 拖架 |

转向架生成规则：
- `controlSectionCount = 3` 时生成 6 行。
- UI 行名可显示为 `bogie1` 到 `bogie6`。
- YAML 名称使用“转向架类型 + 物理位置编号”。
- 固定命名方式：`trailer_bogie_1`、`powered_bogie_2` 等。
- 后缀数字表示列车编组中的物理转向架位置；前缀表示该位置选择的转向架类型。
- 如果用户把 bogie1 从拖架改为动架，YAML 名称从 `trailer_bogie_1` 变为 `powered_bogie_1`。

序列化示例：

```yaml
controller_type: bogie
n_bogies_by_controller: 1
n_springs_by_controller: 2
n_cylinders_by_controller: 4
vehicle_config:
  bogies:
    - name: trailer_bogie_1
      bogie_type: trailer_bogie
```

校验：
- `controlSectionCount` 必填，且必须是正整数。
- 生成 bogie 数量必须等于 `controlSectionCount * 2`。
- 每个 bogie 都必须选择动架/拖架类型。
- YAML bogie 名称必须唯一。

---

## 页面 5：载荷与空簧配置

用途：配置类型级质量参数和空簧参数。

质量表：

| UI 行 | YAML 前缀 | AW0 | AW2 | AW3 | 转向架自重 |
| --- | --- | --- | --- | --- | --- |
| 拖架 | `mass_params.trailer_bogie` | `mass_static.AW0` | `mass_static.AW2` | `mass_static.AW3` | `bogie_weight` |
| 动架 | `mass_params.powered_bogie` | `mass_static.AW0` | `mass_static.AW2` | `mass_static.AW3` | `bogie_weight` |

其他质量字段：

| UI 字段 | YAML 字段 | 控件 |
| --- | --- | --- |
| 拖架旋转质量系数 | `mass_params.trailer_bogie.rotational_mass_factor` | 数字输入 |
| 动架旋转质量系数 | `mass_params.powered_bogie.rotational_mass_factor` | 数字输入 |

空簧字段，动架/拖架各一组：

| UI 字段 | YAML 字段 | 控件 |
| --- | --- | --- |
| 空簧输入方式 | `air_spring.*.mode` | 单选：特征点 / 线性公式 |
| 特征点列表 | `air_spring.*.points` | 可增删表格 |
| 特征点簧上重量 | `sprung_mass_by_spring_ton` | 数字输入，单位 `ton` |
| 特征点空簧压力 | `pressure_kpa` | 数字输入，单位 `kPa` |
| 线性系数 k | `airspring_k` | 数字输入，单位 `kPa/ton` |
| 线性截距 b | `airspring_b` | 数字输入，单位 `kPa` |

线性公式显示：

```text
空簧压力(kPa) = airspring_k × 簧上重量(ton) + airspring_b
```

校验：
- AW0/AW2/AW3 静态质量都必填。
- `mass_static > 0`
- `bogie_weight > 0`
- 对每种转向架类型和每个载荷组，`mass_static > bogie_weight`
- `rotational_mass_factor >= 0`
- 特征点模式至少 2 个点。
- 特征点压力和簧上重量都必须 `> 0`。

---

## 页面 6：基础制动配置

用途：配置当前踏面制动缸机械模型，同时预留停放制动相关输入。

| UI 字段 | YAML 字段 | 控件 |
| --- | --- | --- |
| 基础制动形式 | `mech_params.cylinder_type` | 只读 `踏面制动` |
| 有效面积 | `mech_params.Sc` | 数字输入，单位 `m^2` |
| 动摩擦系数 | `mech_params.xi` | 数字输入 |
| 外部倍率 | `mech_params.Lo` | 数字输入 |
| 内部倍率 | `mech_params.Li` | 数字输入 |
| 制动缸复位力 | `mech_params.Fs1` | 数字输入，单位 `kN` |
| 附加复位力 | `mech_params.Fs2` | 数字输入，单位 `kN` |
| 外部效率 | `mech_params.eta_o` | 数字输入 |
| 内部效率 | `mech_params.eta_i` | 数字输入 |
| 静摩擦系数 | UI 预留字段 | 数字输入，不写入 YAML |

序列化：
- `cylinder_type` 始终写入 `tread_cylinder`。
- 静摩擦系数只保留在 UI 状态或未来持久化字段中，当前不写入 YAML。

校验：
- `Sc > 0`
- `xi > 0`
- `Li > 0`
- `eta_i > 0`
- `Lo > 0`
- `eta_o > 0`
- `Fs1 >= 0`
- `Fs2 >= 0`

---

## 页面 7：试验标定配置

用途：配置可选的输出侧压力标定。

| UI 字段 | YAML 字段 | 控件 |
| --- | --- | --- |
| 是否启用标定 | `pressure_calibration.enabled` | 开关 |
| 标定载荷工况 | `pressure_calibration.calibrated` | 卡片 |
| 常用制动标定 | `calibrated.*.FSB` | 卡片 |
| 紧急制动标定 | `calibrated.*.EB` | 卡片 |
| 初闸压力 | `BCP0` | 数字输入，单位 `kPa` |
| k(f) 分段 | `k_segments` | 表格 |
| AW2 fallback | `fallback.AW2` | 下拉，默认 AW3 |

行为：
- 标定关闭时，标定区域置灰且不能编辑。
- 即使标定关闭，当前 `Inputs` 契约仍要求 `pressure_calibration.calibrated` 有 AW0/AW3，因此前端内部可以保留默认占位值以满足契约。
- 标定开启时，AW0 和 AW3 卡片必填。
- AW2 默认隐藏。
- FSB/EB 标定区域的 `+` 可以增加 AW2 等后端支持的载荷工况。

k 分段字段：

| UI 字段 | YAML 字段 | 控件 |
| --- | --- | --- |
| 最小制动力 | `min_f` | 数字输入，单位 `kN` |
| 最大制动力 | `max_f` | 数字输入，单位 `kN` |
| 类型 | `kind` | 下拉：常数 / 线性 |
| k 值 | `value` | 常数模式数字输入 |
| 起始 k | `start_value` | 线性模式数字输入 |
| 结束 k | `end_value` | 线性模式数字输入 |

校验：
- `BCP0 >= 0`
- 每个标定项至少有一个 k 分段。
- 常数分段必须有 `value`。
- 线性分段必须有 `start_value` 和 `end_value`。
- `min_f >= max_f` 时，UI 应给出警告；当前后端契约还未强制校验这个规则。

---

## 页面 8：校验与导出

用途：生成 YAML、调用后端 S1 校验、导出文件。

控件：
- 导入 YAML
- 生成 YAML
- S1 校验
- 导出 YAML
- 保存配置；持久化后端未完成前禁用

校验展示：
- 顶部/右侧校验框显示后端 S1 错误。
- 能映射到字段的错误，在字段旁同步显示。
- 不能映射的错误留在汇总框中。

导出文件名：

```text
{projectCode}_input_{YYYYMMDD_HHmm}.yaml
```

示例：

```text
TKQ001_input_20260423_1530.yaml
```

---

## YAML 序列化规则

序列化时按以下顺序输出：

```yaml
v0: ...
V_list: [...]
brake_types: ...
requirement: ...
response_time: ...
load_groups: [AW0, AW2, AW3]
controller_type: bogie
n_bogies_by_controller: 1
n_springs_by_controller: 2
n_cylinders_by_controller: 4
allocation_strategy: ...
vehicle_config: ...
mass_params: ...
air_spring: ...
mech_params: ...
pressure_calibration: ...
EB_limit_min: ...
```

不要序列化：
- `projectName`
- `projectCode`
- `email`
- `note`
- UI 步骤状态
- 静摩擦系数
- 未来车控专用字段

中文到英文枚举映射：

| UI 标签 | YAML 值 |
| --- | --- |
| 架控 | `bogie` |
| 动架 | `powered_bogie` |
| 拖架 | `trailer_bogie` |
| 等磨耗 | `equal_wear` |
| 等黏着 | `equal_adhesion` |
| 运动学计算 | `kinematic` |
| FSB 百分比 | `ratio_of_FSB` |
| 特征点 | `fitted_from_points` |
| 线性公式 | `explicit_linear` |
| 踏面制动 | `tread_cylinder` |

---

## 字段提示词要求

每个输入项都要有 hover 提示词。提示词回答：
- 字段含义。
- 单位。
- 是否写入 YAML。
- 特殊规则。

示例：

```text
最高速度：技术条件定义点速度，单位 km/h，写入 v0。
控制网段编组数量：架控时每个编组生成 2 个 bogie，当前只支持架控。
AW2 静态称重：必须填写，单位 ton，用于 AW2 载荷组质量计算。
静摩擦系数：预留给后续停放制动力校核，当前不写入 input.yaml。
```

---

## 前端校验策略

前端只做轻量、友好的即时校验。

前端校验：
- 必填。
- 数字格式。
- 明显的正数/非负数约束。
- AW0/AW2/AW3 是否完整。
- FSB/EB 是否固定存在。
- 生成 bogie 数量是否正确。

后端 S1 校验：
- 完整 `Inputs` 结构。
- pydantic 模型约束。
- 契约相关业务规则。
- 后续后端契约变更。

前端不要完整复制后端校验逻辑。以后端 S1 为权威。

---

## 实施任务

### 任务 1：确认前端放置位置

**文件：**
- 读取：`AGENTS.md`
- 暂不改代码

**步骤 1：确认位置**

请用户批准一个位置：
- `frontend/`
- `src/brake_calc/ui/`
- `docs/ui-prototype/`

预期：新增文件前必须有明确批准。

**步骤 2：记录决定**

更新本计划或追加短说明，记录批准的位置。

**步骤 3：提交**

只有用户要求提交 plan/doc 时才提交。

### 任务 2：搭建 UI 外壳

**文件：**
- 创建：已批准前端 app 文件
- 测试：如果所选技术栈支持，创建前端 smoke test

**步骤 1：创建工作台布局**

实现：
- 左侧步骤导航
- 中间表单内容
- 右侧校验/YAML 预览栏

**步骤 2：添加静态步骤导航**

添加本计划中的 8 个步骤。

**步骤 3：添加 smoke test**

验证工作台标题和导航能渲染。

**步骤 4：运行前端测试**

运行所选技术栈的测试命令。

**步骤 5：提交**

```bash
git commit -m "feat(ui): scaffold input yaml workbench"
```

### 任务 3：添加 FormState 模型和默认值

**文件：**
- 创建：`features/input-yaml/model/formState.ts`
- 创建：`features/input-yaml/model/defaults.ts`
- 测试：`features/input-yaml/model/formState.test.ts`

**步骤 1：定义 FormState 类型**

按本计划定义各 section 类型。

**步骤 2：定义默认值**

默认值包括：
- `loadGroups = ["AW0", "AW2", "AW3"]`
- `controller_type = bogie`
- `n_bogies_by_controller = 1`
- `n_springs_by_controller = 2`
- `n_cylinders_by_controller = 4`
- FSB 和 EB 固定存在
- `pressure_calibration.enabled = false`

**步骤 3：测试默认值**

验证默认值包含 FSB/EB、固定载荷组和架控固定参数。

**步骤 4：运行测试**

运行前端测试命令。

**步骤 5：提交**

```bash
git commit -m "feat(ui): define input yaml form state"
```

### 任务 4：实现项目基础信息和运行基础配置页面

**文件：**
- 创建/修改：项目元数据组件
- 创建/修改：运行配置组件
- 测试：组件测试

**步骤 1：实现项目元数据表单**

字段：
- 项目名称
- 项目代号 / TKQ
- 邮箱
- 备注

**步骤 2：实现运行配置表单**

字段：
- `v0`
- `V_list`
- 固定 `load_groups`
- `allocation_strategy`
- `EB_limit_min`

**步骤 3：添加提示词和单位标签**

数值输入旁必须显示单位。

**步骤 4：添加测试**

验证值能更新 FormState，且项目元数据不会出现在 YAML 序列化结果中。

**步骤 5：提交**

```bash
git commit -m "feat(ui): add project and run configuration forms"
```

### 任务 5：实现制动需求页面

**文件：**
- 创建/修改：制动需求组件
- 测试：制动需求组件测试

**步骤 1：添加锁定的 FSB/EB 行**

FSB 和 EB 必须可见且不可删除。

**步骤 2：添加自定义 FSB 百分比制动类型**

允许增删自定义行，使用中文标签和百分比输入。

**步骤 3：添加 requirement 和 response_time 输入**

按上文定义实现 FSB 和 EB 区域。

**步骤 4：测试百分比转换**

验证 UI `50%` 序列化为 `ratio: 0.5`。

**步骤 5：提交**

```bash
git commit -m "feat(ui): add braking requirement form"
```

### 任务 6：实现车辆与控制器页面

**文件：**
- 创建/修改：车辆控制器组件
- 测试：车辆控制器测试

**步骤 1：添加控制方式展示**

显示“架控”可用，“车控”预留/禁用。

**步骤 2：添加控制网段编组数量**

输入 `N` 时生成 `N * 2` 个 bogie 行。

**步骤 3：添加转向架类型表格**

每行选择动架或拖架。

**步骤 4：测试 bogie 数量**

验证输入 `3` 生成 6 个 bogie，YAML 中有 6 条 `vehicle_config.bogies`。

**步骤 5：提交**

```bash
git commit -m "feat(ui): add bogie controller configuration"
```

### 任务 7：实现载荷与空簧页面

**文件：**
- 创建/修改：载荷与空簧组件
- 测试：载荷与空簧测试

**步骤 1：添加质量表**

行：
- 拖架
- 动架

列：
- AW0
- AW2
- AW3
- 转向架自重

**步骤 2：添加旋转质量系数输入**

动架和拖架各一个。

**步骤 3：添加空簧模式切换**

支持特征点和显式线性公式。

**步骤 4：显示线性公式**

```text
空簧压力(kPa) = airspring_k × 簧上重量(ton) + airspring_b
```

**步骤 5：测试 YAML 映射**

验证动架/拖架质量和转向架自重映射到 `mass_params`。

**步骤 6：提交**

```bash
git commit -m "feat(ui): add load and air spring configuration"
```

### 任务 8：实现基础制动页面

**文件：**
- 创建/修改：基础制动组件
- 测试：基础制动测试

**步骤 1：添加踏面制动缸表单**

实现当前所有 `mech_params` 输入。

**步骤 2：添加静摩擦系数预留输入**

展示字段，但不序列化到 YAML。

**步骤 3：添加测试**

验证 `mech_params` 正确序列化，静摩擦系数不序列化。

**步骤 4：提交**

```bash
git commit -m "feat(ui): add base brake configuration form"
```

### 任务 9：实现标定页面

**文件：**
- 创建/修改：标定组件
- 测试：标定测试

**步骤 1：添加标定启用开关**

关闭时禁用卡片区域。

**步骤 2：添加 AW0/AW3 的 FSB/EB 卡片**

每张卡片包含 `BCP0` 和 `k_segments`。

**步骤 3：添加可选载荷工况**

使用 `+` 增加 AW2 或其他后端支持的 `LoadGroup`。

**步骤 4：添加 k 分段表**

支持常数和线性模式。

**步骤 5：测试禁用行为**

验证标定关闭时不能编辑，但仍能生成满足当前契约的 YAML 占位结构。

**步骤 6：提交**

```bash
git commit -m "feat(ui): add pressure calibration form"
```

### 任务 10：实现 YAML 序列化器

**文件：**
- 创建：`features/input-yaml/serialization/toInputsYaml.ts`
- 测试：`features/input-yaml/serialization/toInputsYaml.test.ts`

**步骤 1：FormState 序列化为 Inputs object**

将所有 UI 字段映射到当前后端契约。

**步骤 2：Inputs object 序列化为 YAML 文本**

字段顺序与 `configs/example_input.yaml` 保持一致。

**步骤 3：添加 fixture 测试**

使用接近 `configs/example_input.yaml` 的值，验证输出形状。

**步骤 4：验证排除 UI 字段**

项目元数据和静摩擦系数不能出现在 YAML 中。

**步骤 5：提交**

```bash
git commit -m "feat(ui): serialize form state to input yaml"
```

### 任务 11：添加 YAML 预览和校验结果 UI

**文件：**
- 创建/修改：预览栏组件
- 测试：预览栏测试

**步骤 1：添加只读 YAML 预览**

FormState 变化时实时更新。

**步骤 2：添加 S1 校验结果面板**

展示：
- 尚未校验
- 校验通过
- 校验失败
- 后端不可用

**步骤 3：添加字段跳转**

已知字段错误点击后聚焦对应字段。

**步骤 4：提交**

```bash
git commit -m "feat(ui): add yaml preview and validation panel"
```

### 任务 12：添加导入和导出 UI

**文件：**
- 创建/修改：导入导出组件
- 测试：导入导出测试

**步骤 1：添加导入按钮**

接受 `.yaml` / `.yml` 文件。

**步骤 2：添加导入状态占位**

真实解析可能调用后端；前端 MVP 先定义 UI 状态和错误展示。

**步骤 3：添加导出文件名生成**

使用：

```text
{projectCode}_input_{YYYYMMDD_HHmm}.yaml
```

**步骤 4：测试文件名**

验证包含项目代号和时间戳。

**步骤 5：提交**

```bash
git commit -m "feat(ui): add yaml import and export controls"
```

### 任务 13：端到端 UI 验收

**文件：**
- 测试：浏览器或组件集成测试

**步骤 1：通过 UI 填入 example input**

使用 `configs/example_input.yaml` 的值。

**步骤 2：生成 YAML**

预期：YAML 包含当前 `Inputs` 字段，不包含项目元数据。

**步骤 3：后端可用后调用校验**

预期：S1 校验通过。

**步骤 4：检查响应式布局**

优先检查桌面端。移动端对该工程工具可降级。

**步骤 5：提交**

```bash
git commit -m "test(ui): cover input yaml workbench flow"
```

---

## 验收标准

前端 UI 满足以下条件即视为完成：

- 操作人员可以不写 YAML，填写所有当前 `Inputs` 必填字段。
- UI 明确区分项目元数据和 YAML 字段。
- 控制网段编组数量为 `3` 时，架控模式生成 6 个 bogie。
- 动架/拖架静态质量和转向架自重都可见。
- AW0/AW2/AW3 静态质量始终可见且必填。
- FSB 和 EB 始终存在。
- 标定关闭时标定字段禁用。
- YAML 预览符合当前契约形状。
- 导出文件名包含项目代号和时间戳。
- UI 可以显示 S1 校验结果。

## 实施前待确认

1. 前端 app 放在哪里：`frontend/`、`src/brake_calc/ui/`，还是其他位置？
2. 第一版直接使用生产级前端栈，还是先做静态 HTML 原型？
3. 标定关闭时，是序列化 `configs/example_input.yaml` 中类似的占位标定值，还是后续放宽后端契约，让关闭标定时可省略标定明细？

## 下一份计划

前端 UI 计划确认后，继续看：

```text
docs/plans/2026-04-23-input-yaml-sqlite-storage.md
```

该计划定义 SQLite 表结构、版本管理、检索字段、配置历史、导入导出记录，以及 UI-only 字段如何与 `input.yaml` 分开持久化。
