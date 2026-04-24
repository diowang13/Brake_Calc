# Brake Calc V1 Contract And Feature Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the agreed V1 feature set, freeze a stable V1 `input.yaml` contract, and align the frontend, storage, and backend plans to that contract before Web/Hermes development begins.

**Architecture:** V1 is completed first in the calculation core, not in the web shell. The input contract is now frozen in code and tests. The remaining implementation order is: upgrade workflow modules and report outputs to match the frozen contract, lock example/integration fixtures, then build the frontend, persistence, and Hermes/API layers on top of the frozen contract.

**Tech Stack:** Python 3.11+, pydantic v2, pytest, YAML-based configuration, existing brake-calc workflow modules, future Web/API/storage layers described in companion plans.

---

## V1 目标

这份计划解决三个问题：

1. 先把 V1 必做功能补齐，再冻结 `input.yaml`
2. 冻结后再做前端、数据库和 API/Hermes，避免重复返工
3. 给 `AGENTS.md` 和 spec 提供明确修改清单，由你来更新人类维护文档

## 当前进度

已完成并应视为基线：

- `AGENTS.md`、spec、V1 plan 已完成一致性收口
- Task 1 已完成：
  - `src/brake_calc/contracts/inputs.py` 已升级到 V1 契约
  - `tests/unit/contracts/test_inputs.py` 已补齐并冻结 V1 输入契约测试
  - `tests/fixtures/schemas/inputs.schema.json` 已刷新
- `electric_brake` 输入契约已经冻结；后续只剩 report 摘要透传，不再单独作为 contracts 任务

## V1 Active Scope

V1 必须实现并进入正式契约：

- `controller_type = bogie | car`
- `FSB`、`EB`、`FB`、`ratio_of_FSB`
- `tread_cylinder`、`caliper_cylinder`
- AW0 / AW2 / AW3
- 空簧特征点和线性公式
- 试验点驱动的压力标定
- 全局黏着限制 `adhesion.mu_limit`
- 停放制动力校核
- 电制动特性输入预留
- 结构化报告与 Markdown 报告
- 自动调整记录

## V1 Not In Scope

本轮不做：

- 电空配合制动计算
- 多用户权限
- 真实邮件 provider 集成
- 云端部署脚本

## V1 输入契约要点

### 1. 顶层建议增加 `schema_version`

```yaml
schema_version: 1
```

### 2. 控制器类型

架控：

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

车控：

```yaml
controller_type: car
n_bogies_by_controller: 2
n_springs_by_controller: 4
n_cylinders_by_controller: 8
vehicle_config:
  cars:
    - name: trailer_car_1
      car_type: trailer_car
    - name: powered_car_2
      car_type: powered_car
```

规则：
- `powered_car` = 两个 `powered_bogie`
- `trailer_car` = 两个 `trailer_bogie`
- 混合动/拖架车辆不纳入 V1 车控；业务上改用架控
- `bogie_weight` 在输入里仍表示单个 bogie 自重，车控内部聚合时乘 2
- 车控下空簧压力输出仍是单个空簧压力

### 3. 制动类型

```yaml
brake_types:
  - name: FSB
    source: kinematic
  - name: EB
    source: kinematic
  - name: FB
    source: fast_brake
  - name: holding_brake
    source: ratio_of_FSB
    ratio: 0.5
```

规则：
- `FSB`、`EB` 必选
- `FB` 可选
- `ratio_of_FSB` 自定义类型可增删

### 4. FB / Fast Brake 规则

`FB` 不属于现有 `kinematic` 或 `ratio_of_FSB`，而是新 source：

```yaml
source: fast_brake
```

规则：
- `Beta_FB = Beta_EB`
- FB 强制等黏着
- FB 不配置 `requirement.FB`
- FB 需要配置 `response_time.FB.t1` 和 `response_time.FB.impulse_rate`
- S9 需要输出 FB 在不同初速度下的理论距离和平均减速度

示例：

```yaml
response_time:
  FB:
    t1: 0.4
    impulse_rate: 0.75
```

### 5. 机械模型

基础结构延续现有 `mech_params`，但 V1 支持：

```yaml
mech_params:
  cylinder_type: tread_cylinder | caliper_cylinder
  Sc: ...
  xi: ...
  Li: ...
  eta_i: ...
  Lo: ...
  eta_o: ...
  Fs1: ...
  Fs2: ...
  Dw: ...   # only for caliper_cylinder
  Rf: ...   # only for caliper_cylinder
```

规则：
- `tread_cylinder`：网页不显示 `Dw`、`Rf`，公式中 `Dw / (2 * Rf) = 1`
- `caliper_cylinder`：网页显示并要求填写 `Dw`、`Rf`
- `n_cylinders_by_controller` 仍由 `controller_type` 自动决定，用户不手填

### 6. 标定输入结构

V1 标定不再让用户直接维护完整 `k_segments`，而是使用“试验点驱动”：

```yaml
pressure_calibration:
  enabled: true
  service_brake:
    BCP0: 25.0
    point_pair_mode: aw3_aw0
    points:
      - load_group: AW0
        brake_type: FB
        k_for_code: 1050
      - load_group: AW3
        brake_type: FSB
        k_for_code: 1200
  emergency_brake:
    BCP0: 30.0
    point_pair_mode: aw3_aw0
    points:
      - load_group: AW0
        brake_type: EB
        k_for_code: 1100
      - load_group: AW3
        brake_type: EB
        k_for_code: 1250
```

规则：
- `service_brake` 生成 `k_sb(f)` 与 `BCP0_sb`
- `emergency_brake` 生成 `k_eb(f)` 与 `BCP0_eb`
- 支持 `aw3_aw0`、`aw3_aw2`
- 标定点力坐标选择：
  - AW0 取最大 controller force
  - AW3 取最小 controller force
  - AW2 取平均 controller force
- AW3-AW2 时需要外推到 AW0 参考点：
  - 常用/快速制动：若项目启用 FB，则取 `AW0 + FB` 最大力；否则取 `AW0 + FSB` 最大力
  - 紧急制动：取 `AW0 + EB` 最大力
- 生成曲线必须覆盖有效范围，不能出现无有效数值区间

### 7. FB 压力不得超过 EB

若 S8 标定后出现 `BCP_FB > BCP_EB`：

- 自动提高 `BCP0_EB`
- 重新计算 EB 压力标准
- 保留原始用户配置
- 单独记录自动调整
- 网页/报告提示：
  - “快速制动压力超过紧急制动压力，已自动上调紧急制动初闸压力 BCP0_EB 并重新计算紧急制动压力标准。”

### 8. 黏着限制

```yaml
adhesion:
  mu_limit: 0.16
```

规则：
- 全局一个值
- 若用户配置 `equal_wear` 导致超黏着：
  - 自动改用 `equal_adhesion`
  - 保留原始输入
  - 记录自动调整
  - 网页/报告提示：
    - “当前载荷配置下按等磨耗分配会超过黏着限制，已强制使用等黏着分配。”

### 9. 停放制动力校核

```yaml
parking_brake_check:
  enabled: true
  required_safety_margin: 1.2
  static_friction_coefficient: 0.35
  n_parking_cylinders_by_car: 1
  cylinder:
    Fp: 8.75
    Fs1: 1.2
    Fs2: 0.15
    Lpi: 2.04
    eta_pi: 1.0
    Lo: 1.0
    eta_o: 1.0
  environment:
    wind_speed_max: 34.0
    wind_resistance_coefficient: 0.0037
    grade_by_load_group:
      AW0: 40
      AW3: 40
```

规则：
- 只做校核，不参与压力标准计算
- 停放缸参数全列共享
- `n_parking_cylinders_by_car` 按每车定义
- 停放制动力公式中的 `Rf`、`Dw` 复用基础制动机械模型：
  - `caliper_cylinder` 时复用 `mech_params.Rf`、`mech_params.Dw`
  - `tread_cylinder` 时按比值 1 处理
- 输出：
  - 每车双侧作用力 `F_N_PB`
  - 每车停放制动力 `F_PB`
  - 每车倾斜力
  - 每车安全余量
  - 整列总停放制动力
  - 整列总倾斜力
  - 整列安全余量
  - 是否通过

### 10. 电制动特性输入

```yaml
electric_brake:
  enabled: false
  force_scope: train_total
  characteristic_points: []
```

规则：
- `force_scope` 允许：
  - `train_total`
  - `per_car`
  - `per_bogie`
  - `per_axle`
- 每个 bogie 固定 2 根轴
- 当前不参与主制动计算
- 网页支持上传图片/文档，由模型识别后填入 `characteristic_points`
- 网页和报告仅展示识别摘要：
  - 前 2~3 个点
  - `...`
  - 后 2~3 个点

---

## 结构化报告要求

V1 报告至少包含：

1. 配置摘要表格
2. 计算结果表格
   - `Beta_list`
   - AW0/AW2/AW3 动态载荷
   - 空簧压力标准
   - 不同制动类型 BCP 压力标准
3. 公式与参数
   - 标定点
   - `k_sb(f)` / `k_eb(f)`
   - `BCP0_sb` / `BCP0_eb`
   - 力 `kN -> kPa` 公式
   - 空簧 `kPa -> 动态载重 ton` 公式
   - 常用制动力分配方式
4. 校核结果
   - 停放缸作用力
   - 停放制动力
   - 倾斜力
   - 安全余量
   - AW0/AW2/AW3 的 `k_for_code`
5. 自动调整记录

建议新增结构化字段：

- `auto_adjustments`
- `parking_brake_check_result`
- `calibration_summary`
- `electric_brake_summary`
- `effective_allocation_strategy_by_case`

---

## 剩余代码实施顺序

### Task 2: 控制器和制动类型升级

**Files:**
- Modify: `src/brake_calc/modules/s2_derive_requirement.py`
- Modify: `src/brake_calc/modules/s3_response_compensation.py`
- Modify: `src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py`
- Modify: `src/brake_calc/modules/s5_calc_required_brake_force.py`
- Modify: `src/brake_calc/modules/s6_allocate_brake_force.py`
- Test: `tests/unit/modules/test_s3_response_compensation.py`
- Test: `tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py`
- Test: `tests/unit/modules/test_s5_calc_required_brake_force.py`
- Test: `tests/unit/modules/test_s6_allocate_brake_force.py`

**Step 1: 写失败的测试**

覆盖：
- 车控质量聚合
- FB Beta 规则
- FB 强制等黏着
- 超黏着自动切换等黏着

**Step 2: 实现最小代码**

只让上述测试通过。

**Step 3: 运行测试**

```bash
uv run pytest tests/unit/modules/test_s3_response_compensation.py tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py tests/unit/modules/test_s5_calc_required_brake_force.py tests/unit/modules/test_s6_allocate_brake_force.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(workflow): add v1 controller and fast brake rules"
```

### Task 3: 基础机械模型升级

**Files:**
- Modify: `src/brake_calc/modules/s7_force_to_pressure_base.py`
- Modify: `src/brake_calc/domain/pressure.py`
- Test: `tests/unit/modules/test_s7_force_to_pressure_base.py`

**Step 1: 写失败的测试**

覆盖：
- `tread_cylinder` 默认比值为 1
- `caliper_cylinder` 使用 `Dw` 和 `Rf`

**Step 2: 实现最小代码**

支持 `caliper_cylinder` 路径。

**Step 3: 运行测试**

```bash
uv run pytest tests/unit/modules/test_s7_force_to_pressure_base.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(workflow): add caliper cylinder support"
```

### Task 4: 压力标定升级

**Files:**
- Modify: `src/brake_calc/modules/s8_apply_k_calibration.py`
- Modify: `src/brake_calc/domain/calibration.py`
- Test: `tests/unit/modules/test_s8_apply_k_calibration.py`

**Step 1: 写失败的测试**

覆盖：
- 试验点驱动生成 `k_sb(f)` / `k_eb(f)`
- AW3-AW0 组合
- AW3-AW2 组合外推
- FB 使用 `k_sb(f)`
- FB 超过 EB 时自动提高 `BCP0_EB`

**Step 2: 实现最小代码**

先实现曲线生成和自动调整。

**Step 3: 运行测试**

```bash
uv run pytest tests/unit/modules/test_s8_apply_k_calibration.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(workflow): upgrade v1 pressure calibration"
```

### Task 5: 停放制动力校核和结构化报告

**Files:**
- Create: `src/brake_calc/domain/parking_brake.py`
- Modify: `src/brake_calc/modules/s9_summarize_and_checks.py`
- Modify: `src/brake_calc/contracts/report.py`
- Modify: `src/brake_calc/domain/reporting.py`
- Modify: `src/brake_calc/contracts/inputs.py` (only if report-facing summary typing needs a narrow follow-up fix)
- Test: `tests/unit/modules/test_s9_summarize_and_checks.py`
- Test: `tests/unit/test_report_domain.py`
- Test: `tests/unit/test_report_output.py`

**Step 1: 写失败的测试**

覆盖：
- 每车与整列停放制动力校核
- 自动调整记录进入 report
- `electric_brake_summary`
- Markdown 所需结果字段

**Step 2: 实现最小代码**

优先输出结构化 report，再接 Markdown；`electric_brake` 当前只做摘要透传，不参与主制动计算。

**Step 3: 运行测试**

```bash
uv run pytest tests/unit/modules/test_s9_summarize_and_checks.py tests/unit/test_report_domain.py tests/unit/test_report_output.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(report): add v1 parking checks and adjustment summary"
```

### Task 6: 运行完整 V1 验证

**Files:**
- Modify: `configs/example_input.yaml`
- Test: `tests/integration/test_workflow_end_to_end.py`

**Step 1: 更新 example input**

覆盖：
- 架控或车控主路径
- FSB/EB/FB
- 标定
- 黏着限制
- 停放制动力校核
- 电制动输入

**Step 2: 运行 focused 和 full checks**

```bash
uv run ruff check src tests
uv run mypy src
uv run pytest
```

**Step 3: Commit**

```bash
git commit -m "test(v1): lock v1 contract and workflow behavior"
```

---

## 推荐执行策略

建议采用分波次并行，而不是把剩余任务一次性全部并行展开。

### 波次 1

- 主代理：Task 2
- 子代理 A：Task 3

原因：

- `Task 2` 会稳定 `FB`、车控质量聚合、分配策略和自动切换语义，是 `s8/s9` 的直接前置
- `Task 3` 的写集主要在 `s7_force_to_pressure_base.py` 和 `domain/pressure.py`，与 Task 2 冲突较少，适合并行

### 波次 2

- 主代理或子代理 B：Task 4
- 子代理 C：Task 5

前提：

- 波次 1 已合并并确认测试通过

原因：

- `Task 4` 依赖 Task 2 的 brake type/controller 语义，以及 Task 3 的基础机械模型输出
- `Task 5` 是汇总层，依赖前序模块字段稳定后再接入最省返工

### 收尾

- 主代理执行 Task 6
- 统一跑 `ruff`、`mypy`、unit、integration 和 example input 验证

不建议的方式：

- 不要把 Task 2、4、5 同时开工
- 不要把 report 层在上游字段未稳定前提前实现
- 不要再单开原 Task 6；其剩余内容已经并入 Task 5

---

## 与三份现有计划的对齐要求

### 前端计划

`docs/plans/2026-04-23-input-yaml-frontend-ui.md` 需要按 V1 修正：

- 支持车控，不再只写架控
- 加入 FB 勾选和 `response_time.FB`
- 加入 `caliper_cylinder`
- 仅在夹钳制动时显示 `Dw`、`Rf`
- 加入停放制动力校核区
- 加入 `adhesion.mu_limit`
- 加入电制动上传识别摘要
- 标定页面改为“试验点驱动”

### SQLite 计划

`docs/plans/2026-04-23-input-yaml-sqlite-storage.md` 需要按 V1 修正：

- `input_configs` 增加 `schema_version`
- `report_json` 覆盖：
  - 自动调整
  - 停放制动力校核
  - 标定摘要
  - 电制动摘要
- 如要保存电制动原始图片/文档，增加 `input_artifacts`

### 后端 API 计划

`docs/plans/2026-04-23-input-yaml-backend-api.md` 需要按 V1 修正：

- validate/import/export 支持 V1 新字段
- `run` 返回新的结构化 report
- 增加电制动识别接口占位：
  - `POST /api/electric-brake/recognize`
- 记录自动调整

---

## 你需要修改的文档

### `AGENTS.md`

你需要改：

1. 项目定位
   - 明确 V1 包括车控、FB、停放制动力校核、夹钳制动、电制动输入预留

2. 目录结构约定
   - 如果你同意新增 `domain/parking_brake.py`、`storage/`、`app/`，要在 AGENTS 里允许这些目录/模块

3. 契约规则
   - 声明 V1 `input.yaml` 冻结原则
   - 字段名、单位、枚举值改动必须先改 spec

4. 测试约定
   - 增加对车控、FB、标定、停放制动力校核、夹钳制动的测试要求

### `specs/Brake_Calc_ Workflow_Spec_v1.0.md`

你需要改：

1. Inputs 章节
   - 增加 `schema_version`
   - `controller_type = car`
   - `vehicle_config.cars`
   - `fast_brake`
   - `parking_brake_check`
   - `adhesion`
   - `electric_brake`
   - `caliper_cylinder`
   - 新的试验点驱动标定结构

2. Modules 章节
   - S3：增加 FB 规则
   - S5/S6：增加超黏着自动切换
   - S7：增加 caliper 支持
   - S8：改为试验点驱动标定和 FB/EB 干涉处理
   - S9：增加停放制动力校核、自动调整记录、电制动摘要

3. Outputs 章节
   - 增加 `auto_adjustments`
   - 增加 `parking_brake_check_result`
   - 增加 `electric_brake_summary`
   - 增加 FB 理论速度检查

4. pressure_calibration 章节
   - 改成试验点驱动，而不是直接配置 `k_segments`
   - 写清楚 AW3-AW0 / AW3-AW2 规则

## 验收标准

- V1 必做功能在计算内核中实现完成
- `Inputs` 契约、example YAML、schema snapshot 三者一致
- 关键新增功能都有单测
- 端到端 workflow 能用 V1 example input 跑通
- 自动调整不覆盖原始配置，而是单独记录实际计算使用值
- 三份 Web/DB/API 计划已经和 V1 对齐

## Plan Handoff

Plan complete and saved to `docs/plans/2026-04-24-v1-contract-and-feature-upgrade.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
