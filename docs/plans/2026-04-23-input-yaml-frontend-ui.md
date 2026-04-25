# input.yaml 前端 UI 实施计划

> **给执行 agent 的要求：** 按本计划逐项执行时，必须使用 `superpowers:executing-plans` 技能。

**目标：** 在 storage 与 backend contract 已稳定的前提下，建设一个面向操作人员的中文 Web 工作台，用于编辑 brake-calc V1 输入、调用后端校验/保存/导入/导出/运行，并消费结构化 report。

**架构：** 前端采用“配置工作台”结构：左侧步骤导航，中间表单区，右侧校验与 YAML/运行结果预览。前端维护类型化 `FormState`，通过 backend API 完成 validate/save/load/import/export/run；前端不直接定义持久化协议，不直接推导计算结果。

**技术栈：** 推荐 React + TypeScript + Vite。前端目录位置待人工批准后执行，本计划先固定交互与接口假设，不在本阶段新增目录。

---

## 前置依赖

本计划依赖以下两份计划先完成：

- `2026-04-23-input-yaml-sqlite-storage.md`
- `2026-04-23-input-yaml-backend-api.md`

原因：

- 保存/导入/导出协议先由 backend 决定
- `FormState` 回填 shape 必须与 backend import path 对齐
- report 展示必须消费 backend 返回的结构化 `report`

不建议前端先行 mock 一套长期接口。

---

## V1 对齐结论

前端正式范围必须完整覆盖当前 V1 契约：

- `controller_type = bogie | car`
- `FSB`、`EB`、`FB`、`ratio_of_FSB`
- `response_time.FB`
- `tread_cylinder`、`caliper_cylinder`
- `pressure_calibration.service_brake / emergency_brake / point_pair_mode / points`
- `parking_brake_check`
- `adhesion.mu_limit`
- `electric_brake`

必须删除或改写的旧假设：

- 不再是“只支持架控”
- 不再把 `parking_brake_check` 当预留项
- 不再把 `caliper_cylinder` 当未来项
- 不再使用 `k_segments`
- 不再把 `static_friction_coefficient` 排除在 YAML 外

---

## 页面目标

前端需要完成四件事：

1. 编辑 V1 输入配置
2. 调用 backend 做权威校验
3. 保存/导入/导出配置版本
4. 运行计算并展示 backend 返回的结构化结果

不在前端实现：

- 业务计算
- report 推导
- YAML 权威校验
- 数据库存取

---

## 前端稳定边界

### FormState 原则

- `FormState` 不等于 YAML
- 项目元数据不写入 YAML
- `FormState` 仅用于 UI 编辑体验与 API 请求组织
- YAML 由 backend contract 驱动生成和校验

### backend 依赖的 API

前端必须围绕这些稳定接口设计：

- `POST /api/configs/validate`
- `POST /api/configs`
- `GET /api/configs/{input_config_id}`
- `POST /api/configs/import-yaml`
- `GET /api/configs/{input_config_id}/download`
- `POST /api/configs/{input_config_id}/run`

### report 消费原则

前端只消费 backend 返回的结构化 `report`：

- pressure standards
- calibration summary
- parking brake check
- auto adjustments
- electric brake summary

前端不要根据 YAML 或局部字段自己拼计算结果。

---

## UI 范围与页面分层

推荐把前端拆成两层：

### 第一层：契约与状态骨架

- `FormState` 类型
- API client
- validate/save/load/import/export/run orchestration
- YAML 预览区
- 错误定位

### 第二层：页面与交互

- 项目元数据
- 运行基础配置
- 制动类型与技术条件
- 车辆/控制器
- 载荷与空簧
- 基础制动与停车校核
- 试验点驱动标定
- 运行结果展示

这样可以先打通“可保存、可导入、可校验”的骨架，再完善复杂表单。

---

## 页面结构

### 1. 项目基础信息

只作用于 backend storage，不写入 YAML：

- `project_name`
- `project_code`
- `email`
- `note`

### 2. 运行基础配置

编辑：

- `schema_version`
- `v0`
- `V_list`
- `load_groups`
- `allocation_strategy`
- `EB_limit_min`

### 3. 制动类型与技术条件

编辑：

- `FSB`
- `EB`
- `FB`
- 自定义 `ratio_of_FSB`
- `requirement`
- `response_time`

必须明确：

- `FB` 是可选项，但进入 V1 正式范围
- `FB` 有自己的 `response_time.FB`
- `ratio_of_FSB` 自定义类型可增删

### 4. 车辆与控制器配置

必须支持：

- `controller_type = bogie`
- `controller_type = car`

对应编辑：

- `n_bogies_by_controller`
- `n_springs_by_controller`
- `n_cylinders_by_controller`
- `vehicle_config.bogies`
- `vehicle_config.cars`

前端可以做默认值和模板生成，但不能假设最终只支持架控。

### 5. 载荷与空簧配置

编辑：

- `mass_params`
- `air_spring`

仍保持动架/拖架类型级参数，而不是实例级重复录入。

### 6. 基础制动与停车校核

必须支持：

- `mech_params.cylinder_type = tread_cylinder | caliper_cylinder`
- `Dw` / `Rf` 仅在 `caliper_cylinder` 时显示
- `parking_brake_check`
- `adhesion.mu_limit`
- `electric_brake`

重点：

- `static_friction_coefficient` 现在是正式 YAML 输入，不再是 UI-only 预留项
- 停车校核区必须允许录入：
  - `required_safety_margin`
  - `static_friction_coefficient`
  - `n_parking_cylinders_by_car`
  - `cylinder`
  - `environment.grade_by_load_group`

### 7. 标定配置

标定页面必须从旧版 `k_segments` 改成试验点驱动：

- `pressure_calibration.enabled`
- `service_brake`
- `emergency_brake`
- `point_pair_mode`
- `points`

至少支持：

- `aw3_aw0`
- `aw3_aw2`

表单上必须反映：

- 输入点是离散试验点
- 最终曲线由 backend/workflow 生成

### 8. 校验、导入导出与运行

支持：

- 实时 YAML 预览
- backend validate
- import yaml
- save config
- download yaml
- run config
- 展示结构化 report 摘要

---

## 关键交互规则

### YAML 预览

- 可只读
- 来源于当前 `FormState + backend contract`
- 不作为权威校验结果

### 校验

- 前端只做轻量即时校验
- 后端 validate 是权威
- 错误路径按 dot path 回填字段

### 导入

- 导入 YAML 时必须走 backend `import-yaml`
- backend 返回 `form_state`
- 前端只负责渲染，不自己完整反推 YAML

### 运行结果

- 前端消费 backend 返回的结构化 `report`
- 主视图应与当前已验收 report 口径一致
- 不自行生成 Calibration Summary 或 Parking Brake Summary

---

## 实施任务

### 任务 1：确认前端目录位置

**文件：**

- 读取：`AGENTS.md`
- 暂不改代码

**步骤：**

1. 取得明确批准：
   - `frontend/`
   - 或 `src/brake_calc/ui/`
2. 在计划说明中记录选择结果。
3. 未获批准前不创建前端目录。

### 任务 2：实现 `FormState` 与 API client 骨架

**文件：**

- 创建：前端状态与 API client 文件
- 测试：对应 unit test

**步骤：**

1. 定义 `FormState`，覆盖 V1 全字段。
2. 定义 project metadata 与 YAML fields 的边界。
3. 封装 validate/save/load/import/export/run API client。
4. 运行前端相关测试。
5. 提交：

```bash
git commit -m "feat(ui): add form state and api client"
```

### 任务 3：实现工作台布局与 YAML/校验侧栏

**文件：**

- 创建：工作台页面和预览侧栏
- 测试：布局 smoke test

**步骤：**

1. 左侧步骤导航
2. 中间表单容器
3. 右侧 YAML 预览与校验面板
4. 错误点击定位
5. 运行测试
6. 提交：

```bash
git commit -m "feat(ui): scaffold config workbench"
```

### 任务 4：实现基础配置与制动类型页面

**步骤：**

1. 项目元数据页
2. 运行基础配置页
3. 制动类型/技术条件页，包含 `FB`
4. 校验 `FSB` / `EB` 固定存在
5. 运行测试
6. 提交：

```bash
git commit -m "feat(ui): add run and brake type forms"
```

### 任务 5：实现车辆、载荷、空簧页面

**步骤：**

1. 同时支持 `bogie` 与 `car`
2. 动/拖类型级质量参数
3. 空簧点表与线性模式
4. 运行测试
5. 提交：

```bash
git commit -m "feat(ui): add controller and load forms"
```

### 任务 6：实现基础制动、停车校核、黏着、电制动页面

**步骤：**

1. `tread_cylinder | caliper_cylinder`
2. `Dw` / `Rf` 条件显示
3. `parking_brake_check`
4. `adhesion.mu_limit`
5. `electric_brake`
6. 运行测试
7. 提交：

```bash
git commit -m "feat(ui): add brake, parking, adhesion and electric brake forms"
```

### 任务 7：实现试验点驱动标定页面

**步骤：**

1. `enabled`
2. `service_brake`
3. `emergency_brake`
4. `point_pair_mode`
5. `points`
6. 删除旧 `k_segments` 交互
7. 运行测试
8. 提交：

```bash
git commit -m "feat(ui): add point-pair calibration forms"
```

### 任务 8：接入导入导出与运行结果

**步骤：**

1. import yaml
2. save/load config
3. download yaml
4. run config
5. render structured report summary
6. 运行测试
7. 提交：

```bash
git commit -m "feat(ui): wire config lifecycle and run result views"
```

---

## 验收标准

- 前端可以编辑完整 V1 输入。
- UI 不再假设架控-only。
- `FB`、`caliper_cylinder`、`parking_brake_check`、`adhesion`、`electric_brake`、试验点驱动标定都可编辑。
- YAML 不包含项目元数据。
- 导入 YAML 必须通过 backend import path 成功回填可编辑 `FormState`。
- 前端 validate/save/load/import/export/run 全部走 backend contract。
- 运行结果页面只消费结构化 report。

## 与前两份计划的衔接

frontend 实施前必须满足：

- storage schema 已稳定
- backend service/API contract 已稳定
- import path 已能返回可编辑 `form_state`
- run path 已能返回 V1 结构化 `report`

如果前两份计划未完成，本计划只能做到静态原型，不应开始正式实现。
