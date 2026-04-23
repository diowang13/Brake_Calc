# Input YAML Frontend UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chinese web configuration UI that lets operators generate a valid `input.yaml` for the brake-calc `Inputs` contract without manually editing YAML.

**Architecture:** The UI is a configuration workbench with left-side step navigation, center form panels, and a right-side validation/YAML preview rail. The frontend owns user-friendly form state and serializes it into the backend `Inputs` YAML shape; project metadata such as project name, TKQ/project code, and email stays outside `input.yaml` and is passed to the persistence layer later.

**Tech Stack:** Recommended frontend stack is React + TypeScript + Vite, with a typed FormState model, YAML serialization, and backend-assisted validation through the existing S1/`Inputs` validation flow. Exact frontend package location requires explicit approval because the current repository rules discourage adding new top-level directories without confirmation.

---

## Scope

This plan covers only the frontend UI and interaction design for generating `input.yaml`.

In scope:
- Chinese form workflow for all current YAML fields in `src/brake_calc/contracts/inputs.py`.
- Project metadata form fields for future SQLite persistence.
- FormState design and YAML serialization rules.
- Read-only YAML preview.
- S1 validation result display area.
- Import existing YAML into the UI.
- Export YAML filename behavior.

Out of scope for this plan:
- SQLite schema and persistence implementation.
- Backend API implementation.
- Running the brake calculation workflow.
- Email delivery.
- Car-control backend support.
- Parking brake force check.

Those should be handled by separate plans:
- `docs/plans/2026-04-23-input-yaml-sqlite-storage.md`
- `docs/plans/2026-04-23-input-yaml-backend-api.md`

## Confirmed Product Decisions

- Use design option C: left navigation + center form + right validation/YAML preview.
- UI language is Chinese; generated YAML keys remain English.
- Project name, TKQ/project code, and email are not written into `input.yaml`.
- The full product target is cloud deployment: an externally accessible web UI generates YAML, stores project/config records in a dedicated SQL database, and lets Hermes call backend brake-calc functions as a skill/tool.
- The stored email address is used later by cloud automation to send calculation reports after Hermes/backend execution.
- MVP supports only bogie control in generated YAML.
- The UI includes a control-section count field. For bogie control, generated bogie count is `control_section_count * 2`.
- Example: control-section count `3` generates `bogie1` through `bogie6` in the UI and serializes six `vehicle_config.bogies` rows.
- Future car control is visible as a disabled/reserved mode, but not serialized until backend support exists.
- Load groups AW0/AW2/AW3 are fixed and all three static weight values are required.
- Calibration UI is disabled when `pressure_calibration.enabled = false`.
- AW2 calibration is hidden by default and can be added later through calibration controls.
- Powered/trailer bogie weight must be shown in the load section, separately for powered bogie and trailer bogie.
- Static friction coefficient may be shown as a reserved UI field for future parking brake validation, but it must not be written to current YAML.

## Target Cloud Workflow

The frontend should be designed as the operator-facing entry point for a future cloud workflow:

```text
Operator Web UI
  -> generate and validate input.yaml
  -> save project metadata + YAML/config version to SQL
  -> Hermes agent/tool reads saved config or receives config id
  -> backend imports brake_calc.workflow.runner and runs calculation
  -> backend stores report/result artifacts
  -> cloud automation sends report to stored email
```

Frontend implications:
- Keep project metadata separate from `input.yaml`.
- Treat `projectCode` as a durable lookup key and export filename prefix.
- Keep generated YAML deterministic so Hermes/backend runs are reproducible.
- Preserve enough UI state to reopen and edit a saved configuration later.
- Do not make the browser depend on local CLI commands.

## Proposed Frontend File Placement

The repository currently has no frontend app. Because `AGENTS.md` says agents must not casually add new top-level directories, implementation should begin by confirming one of these locations:

- Preferred, if approved: `frontend/`
- Alternative inside existing Python package boundary: `src/brake_calc/ui/`
- Alternative docs/prototype-only location: `docs/ui-prototype/`

Recommended implementation location after approval:

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

Do not create this structure until the implementation phase and location are approved.

---

## FormState Model

The frontend should not store form data directly as YAML text. It should use a typed FormState and serialize to the backend `Inputs` shape.

Suggested top-level FormState:

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

Project metadata, not written to YAML:

```ts
type ProjectMetadataState = {
  projectName: string;
  projectCode: string;
  email: string;
  note?: string;
};
```

YAML-producing sections:

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

The exact TypeScript should be written during implementation. This plan defines the shape and mapping only.

---

## UI Layout

### Global Workbench Layout

Left rail:
- 项目基础信息
- 运行基础配置
- 制动需求配置
- 车辆与控制器配置
- 载荷与空簧配置
- 基础制动配置
- 试验标定配置
- 校验与导出

Center area:
- Active step form.
- Section-level headings.
- Field-level unit labels.
- Hover tooltips for each field.

Right rail:
- S1 校验结果
- YAML 预览
- Import/export actions

Right rail behavior:
- YAML preview is read-only in MVP.
- S1 validation messages are shown in a dedicated box, matching the user's prototype intent.
- Clicking an error should focus the related field when mapping is available.

---

## Page 1: 项目基础信息

Purpose: collect future persistence and cloud email metadata.

Fields:

| UI Field | Storage Target | YAML? | Control |
| --- | --- | --- | --- |
| 项目名称 | SQLite project metadata | No | Text input |
| 项目代号 / TKQ | SQLite project metadata, export filename | No | Text input |
| 邮箱 | SQLite project metadata, future email delivery | No | Email input |
| 备注 | SQLite project metadata | No | Multi-line text |

Validation:
- 项目名称 required for save.
- 项目代号 required for save/export filename.
- 邮箱 optional for MVP, but if provided must match email format.

Tooltip examples:
- 项目代号 / TKQ: “用于检索配置和生成导出文件名，不写入 input.yaml。”
- 邮箱: “后续云端计算完成后发送报告使用，不写入 input.yaml。”

---

## Page 2: 运行基础配置

Purpose: configure top-level run inputs and global strategy.

Fields:

| UI Field | YAML Field | Control |
| --- | --- | --- |
| 最高速度 | `v0` | Numeric input, unit `km/h` |
| 速度向量 | `V_list` | Add/remove numeric chips, unit `km/h` |
| 载荷组 | `load_groups` | Fixed checked values AW0/AW2/AW3 |
| 常用制动力分配方式 | `allocation_strategy` | Select: 等磨耗 / 等黏着 |
| 紧急制动最小压力 | `EB_limit_min` | Numeric input, unit `kPa` |

Rules:
- `load_groups` is always `["AW0", "AW2", "AW3"]`.
- UI copy must explain EB always uses equal adhesion regardless of `allocation_strategy`.
- `V_list` may be empty in the UI; empty serializes as omitted or `null` based on backend preference.

Validation:
- `v0 > 0`.
- Each `V_list` item `> 0`.
- `EB_limit_min >= 0`.

---

## Page 3: 制动需求配置

Purpose: define FSB/EB and optional ratio-of-FSB brake types.

Fields:

| UI Field | YAML Field | Control |
| --- | --- | --- |
| FSB 制动类型 | `brake_types[].name/source` | Locked row |
| EB 制动类型 | `brake_types[].name/source` | Locked row |
| 自定义制动类型 | `brake_types[]` | Add/remove rows |
| 自定义类型名称 | `brake_types[].name` | Text input |
| FSB 百分比 | `brake_types[].ratio` | Percent numeric input |
| FSB 技术条件 | `requirement.FSB` | Fixed mode `a_mean`, numeric input `m/s^2` |
| EB 技术条件 | `requirement.EB` | Radio `a_mean` / `distance`, numeric input |
| FSB 空走时间 | `response_time.FSB.t1` | Numeric input, unit `s` |
| FSB 冲击率 | `response_time.FSB.impulse_rate` | Numeric input, unit `m/s^3` |
| EB 空走时间 | `response_time.EB.t1` | Numeric input, unit `s` |
| EB 建立时间 | `response_time.EB.t2` | Numeric input, unit `s` |

Mapping:
- UI percent `50` serializes as `ratio: 0.5`.
- FSB serializes as `{name: "FSB", source: "kinematic"}`.
- EB serializes as `{name: "EB", source: "kinematic"}`.
- Custom rows serialize as `{name, source: "ratio_of_FSB", ratio}`.

Validation:
- FSB and EB cannot be deleted.
- Custom names cannot duplicate FSB, EB, or each other.
- Custom ratio must be `> 0`.
- FSB requirement mode is always `a_mean`.
- Requirement values must be `> 0`.
- `FSB.t1 >= 0`.
- `FSB.impulse_rate > 0`.
- `EB.t1 >= 0`.
- `EB.t2 > 0`.

---

## Page 4: 车辆与控制器配置

Purpose: generate the controller/bogie mapping for current bogie-control MVP.

Fields:

| UI Field | YAML Field | Control |
| --- | --- | --- |
| 控制方式 | `controller_type` | Segmented control; 架控 enabled, 车控 disabled |
| 控制网段编组数量 | UI-derived | Integer stepper/input |
| 每 controller 转向架数 | `n_bogies_by_controller` | Read-only `1` |
| 每 controller 空簧数 | `n_springs_by_controller` | Read-only `2` |
| 每 controller 制动缸数 | `n_cylinders_by_controller` | Read-only `4` |
| 转向架列表 | `vehicle_config.bogies` | Table generated from control-section count |
| 转向架类型 | `vehicle_config.bogies[].bogie_type` | Select: 动架 / 拖架 |

Bogie generation:
- If `controlSectionCount = 3`, generate 6 rows.
- UI row labels may be `bogie1` through `bogie6`.
- YAML names should use the selected bogie type plus physical position index.
- Required naming convention: `trailer_bogie_1`, `powered_bogie_2`, etc.
- The suffix number represents the physical bogie position in the train formation. The prefix represents the selected bogie type.
- If a user changes bogie 1 from trailer to powered, its YAML name changes from `trailer_bogie_1` to `powered_bogie_1`.

Serialization:

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

Validation:
- `controlSectionCount` is required and must be a positive integer.
- Generated bogie count must equal `controlSectionCount * 2`.
- Each bogie must choose powered/trailer type.
- YAML bogie names must be unique.

---

## Page 5: 载荷与空簧配置

Purpose: configure type-level mass and air spring parameters.

Fields:

Mass table:

| UI Row | YAML Prefix | AW0 | AW2 | AW3 | Bogie Weight |
| --- | --- | --- | --- | --- | --- |
| 拖架 | `mass_params.trailer_bogie` | `mass_static.AW0` | `mass_static.AW2` | `mass_static.AW3` | `bogie_weight` |
| 动架 | `mass_params.powered_bogie` | `mass_static.AW0` | `mass_static.AW2` | `mass_static.AW3` | `bogie_weight` |

Additional mass fields:

| UI Field | YAML Field | Control |
| --- | --- | --- |
| 拖架旋转质量系数 | `mass_params.trailer_bogie.rotational_mass_factor` | Numeric input |
| 动架旋转质量系数 | `mass_params.powered_bogie.rotational_mass_factor` | Numeric input |

Air spring fields, repeated for powered/trailer:

| UI Field | YAML Field | Control |
| --- | --- | --- |
| 空簧输入方式 | `air_spring.*.mode` | Radio: 特征点 / 线性公式 |
| 特征点列表 | `air_spring.*.points` | Add/remove table |
| 特征点簧上重量 | `sprung_mass_by_spring_ton` | Numeric input, unit `ton` |
| 特征点空簧压力 | `pressure_kpa` | Numeric input, unit `kPa` |
| 线性系数 k | `airspring_k` | Numeric input, unit `kPa/ton` |
| 线性截距 b | `airspring_b` | Numeric input, unit `kPa` |

Linear formula display:

```text
空簧压力(kPa) = airspring_k × 簧上重量(ton) + airspring_b
```

Validation:
- AW0/AW2/AW3 static mass values are all required.
- `mass_static > 0`.
- `bogie_weight > 0`.
- For each type and load group, `mass_static > bogie_weight`.
- `rotational_mass_factor >= 0`.
- Fitted mode requires at least 2 points.
- Point pressure and sprung mass must be `> 0`.

---

## Page 6: 基础制动配置

Purpose: configure current tread-cylinder mechanical model and reserve parking-brake inputs.

Fields:

| UI Field | YAML Field | Control |
| --- | --- | --- |
| 基础制动形式 | `mech_params.cylinder_type` | Read-only `踏面制动` |
| 有效面积 | `mech_params.Sc` | Numeric input, unit `m^2` |
| 动摩擦系数 | `mech_params.xi` | Numeric input |
| 外部倍率 | `mech_params.Lo` | Numeric input |
| 内部倍率 | `mech_params.Li` | Numeric input |
| 制动缸复位力 | `mech_params.Fs1` | Numeric input, unit `kN` |
| 附加复位力 | `mech_params.Fs2` | Numeric input, unit `kN` |
| 外部效率 | `mech_params.eta_o` | Numeric input |
| 内部效率 | `mech_params.eta_i` | Numeric input |
| 静摩擦系数 | UI reserved | Numeric input, not serialized |

Serialization:
- `cylinder_type` always writes `tread_cylinder`.
- Static friction coefficient is retained only in UI state or future storage, not current YAML.

Validation:
- `Sc > 0`.
- `xi > 0`.
- `Li > 0`.
- `eta_i > 0`.
- `Lo > 0`.
- `eta_o > 0`.
- `Fs1 >= 0`.
- `Fs2 >= 0`.

---

## Page 7: 试验标定配置

Purpose: configure optional output-side pressure calibration.

Fields:

| UI Field | YAML Field | Control |
| --- | --- | --- |
| 是否启用标定 | `pressure_calibration.enabled` | Toggle |
| 标定载荷工况 | `pressure_calibration.calibrated` | Cards |
| 常用制动标定 | `calibrated.*.FSB` | Card |
| 紧急制动标定 | `calibrated.*.EB` | Card |
| 初闸压力 | `BCP0` | Numeric input, unit `kPa` |
| k(f) 分段 | `k_segments` | Table |
| AW2 fallback | `fallback.AW2` | Select, default AW3 |

Behavior:
- When disabled, the calibration panel is visually disabled and values cannot be edited.
- Even if disabled, serialization must still satisfy current `Inputs` contract. The frontend can keep default placeholder AW0/AW3 calibration values internally.
- When enabled, AW0 and AW3 cards are required.
- AW2 is hidden by default.
- The `+` control on FSB/EB calibration can add additional load conditions, including AW2.

k segment fields:

| UI Field | YAML Field | Control |
| --- | --- | --- |
| 最小制动力 | `min_f` | Numeric input, unit `kN` |
| 最大制动力 | `max_f` | Numeric input, unit `kN` |
| 类型 | `kind` | Select: 常数 / 线性 |
| k 值 | `value` | Numeric input for constant |
| 起始 k | `start_value` | Numeric input for linear |
| 结束 k | `end_value` | Numeric input for linear |

Validation:
- `BCP0 >= 0`.
- Each entry has at least one k segment.
- Constant segment requires `value`.
- Linear segment requires `start_value` and `end_value`.
- UI should warn if `min_f >= max_f`, although current backend contract does not yet enforce this.

---

## Page 8: 校验与导出

Purpose: generate YAML, validate with backend S1, and export.

Controls:
- 导入 YAML
- 生成 YAML
- S1 校验
- 导出 YAML
- 保存配置, disabled until persistence backend exists

Validation display:
- Top/right validation box shows backend S1 errors.
- Field-level errors show next to mapped fields.
- Unknown or unmapped errors remain in the summary box.

Export filename:

```text
{projectCode}_input_{YYYYMMDD_HHmm}.yaml
```

Example:

```text
TKQ001_input_20260423_1530.yaml
```

---

## YAML Serialization Rules

The serializer maps FormState to this YAML order:

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

Do not serialize:
- `projectName`
- `projectCode`
- `email`
- `note`
- UI step state
- static friction coefficient
- future car-control-only fields

Chinese-to-English enum mapping:

| UI Label | YAML Value |
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

## Tooltip Content Requirements

Every input should have a hover tooltip. Tooltip text should answer:
- What this field means.
- Unit.
- Whether it writes to YAML.
- Any special rule.

Examples:

```text
最高速度：技术条件定义点速度，单位 km/h，写入 v0。
控制网段编组数量：架控时每个编组生成 2 个 bogie，当前只支持架控。
AW2 静态称重：必须填写，单位 ton，用于 AW2 载荷组质量计算。
静摩擦系数：预留给后续停放制动力校核，当前不写入 input.yaml。
```

---

## Frontend Validation Strategy

Frontend validation should be lightweight and user-friendly.

Frontend validates:
- Required fields.
- Numeric parsing.
- Positive and non-negative obvious constraints.
- AW0/AW2/AW3 completeness.
- FSB/EB locked presence.
- Generated bogie count.

Backend S1 validates:
- Full `Inputs` shape.
- Pydantic model constraints.
- Contract-specific rules.
- Any future changes to the backend contract.

The UI should avoid duplicating all backend validation logic. Treat backend S1 as authoritative.

---

## Implementation Tasks

### Task 1: Confirm Frontend Location

**Files:**
- Read: `AGENTS.md`
- No code changes yet

**Step 1: Confirm placement**

Ask the user to approve one frontend location:
- `frontend/`
- `src/brake_calc/ui/`
- `docs/ui-prototype/`

Expected: explicit approval before adding files.

**Step 2: Record the decision**

Update this plan or add a short follow-up note documenting the approved location.

**Step 3: Commit**

Commit only if the user asks for plan/doc commits.

### Task 2: Scaffold UI Shell

**Files:**
- Create: approved frontend app files
- Test: frontend smoke test file if the chosen stack supports it

**Step 1: Create the app shell**

Build the workbench layout:
- left step navigation
- center form content
- right validation/YAML preview rail

**Step 2: Add static step navigation**

Add all eight steps listed in this plan.

**Step 3: Add smoke test**

Verify the workbench title and navigation render.

**Step 4: Run frontend tests**

Run the stack-specific test command.

**Step 5: Commit**

Use a conventional commit such as:

```bash
git commit -m "feat(ui): scaffold input yaml workbench"
```

### Task 3: Add FormState Model and Defaults

**Files:**
- Create: `features/input-yaml/model/formState.ts`
- Create: `features/input-yaml/model/defaults.ts`
- Test: `features/input-yaml/model/formState.test.ts`

**Step 1: Define FormState types**

Create TypeScript types for the sections in this plan.

**Step 2: Define defaults**

Defaults should include:
- `loadGroups = ["AW0", "AW2", "AW3"]`
- `controller_type = bogie`
- `n_bogies_by_controller = 1`
- `n_springs_by_controller = 2`
- `n_cylinders_by_controller = 4`
- FSB and EB locked brake types
- `pressure_calibration.enabled = false`

**Step 3: Test defaults**

Verify defaults include FSB/EB, fixed load groups, and bogie-control fixed values.

**Step 4: Run tests**

Run the frontend test command.

**Step 5: Commit**

```bash
git commit -m "feat(ui): define input yaml form state"
```

### Task 4: Build Project and Run Config Pages

**Files:**
- Create/modify: project metadata components
- Create/modify: run config components
- Test: component tests

**Step 1: Build project metadata form**

Fields:
- 项目名称
- 项目代号 / TKQ
- 邮箱
- 备注

**Step 2: Build run config form**

Fields:
- `v0`
- `V_list`
- fixed `load_groups`
- `allocation_strategy`
- `EB_limit_min`

**Step 3: Add tooltips and unit labels**

Make units visible next to numeric inputs.

**Step 4: Add tests**

Verify values update FormState and project metadata does not appear in YAML serialization.

**Step 5: Commit**

```bash
git commit -m "feat(ui): add project and run configuration forms"
```

### Task 5: Build Braking Requirement Page

**Files:**
- Create/modify: braking config components
- Test: braking component tests

**Step 1: Add locked FSB/EB rows**

FSB and EB should be visible and non-removable.

**Step 2: Add custom ratio-of-FSB rows**

Allow add/remove custom rows with Chinese labels and percent inputs.

**Step 3: Add requirement and response-time inputs**

Implement FSB and EB sections as defined above.

**Step 4: Test ratio conversion**

Verify UI `50%` serializes as `ratio: 0.5`.

**Step 5: Commit**

```bash
git commit -m "feat(ui): add braking requirement form"
```

### Task 6: Build Vehicle Controller Page

**Files:**
- Create/modify: vehicle controller components
- Test: vehicle controller tests

**Step 1: Add control mode display**

Show 架控 enabled and 车控 reserved/disabled.

**Step 2: Add control-section count**

When count is `N`, generate `N * 2` bogie rows.

**Step 3: Add bogie type table**

Each row selects 动架 or 拖架.

**Step 4: Test generated bogie count**

Verify `3` generates six bogies and YAML output has six `vehicle_config.bogies` rows.

**Step 5: Commit**

```bash
git commit -m "feat(ui): add bogie controller configuration"
```

### Task 7: Build Load and Air Spring Page

**Files:**
- Create/modify: load and air spring components
- Test: load and air spring tests

**Step 1: Add mass table**

Rows:
- 拖架
- 动架

Columns:
- AW0
- AW2
- AW3
- 转向架自重

**Step 2: Add rotational mass factor inputs**

One for powered bogie, one for trailer bogie.

**Step 3: Add air spring mode switch**

Support feature points and explicit linear formula.

**Step 4: Render linear formula**

Show:

```text
空簧压力(kPa) = airspring_k × 簧上重量(ton) + airspring_b
```

**Step 5: Test YAML mapping**

Verify powered/trailer mass and bogie weight map to `mass_params`.

**Step 6: Commit**

```bash
git commit -m "feat(ui): add load and air spring configuration"
```

### Task 8: Build Base Brake Page

**Files:**
- Create/modify: base brake components
- Test: base brake tests

**Step 1: Add tread-cylinder form**

Implement all current `mech_params` inputs.

**Step 2: Add reserved static friction input**

Show the field but do not serialize it to YAML.

**Step 3: Add tests**

Verify `mech_params` serializes correctly and static friction does not.

**Step 4: Commit**

```bash
git commit -m "feat(ui): add base brake configuration form"
```

### Task 9: Build Calibration Page

**Files:**
- Create/modify: calibration components
- Test: calibration tests

**Step 1: Add calibration enabled toggle**

Disable the card UI when false.

**Step 2: Add AW0/AW3 FSB/EB cards**

Each card includes `BCP0` and `k_segments`.

**Step 3: Add optional load condition controls**

Use `+` controls to add AW2 or other supported load conditions, constrained to backend-supported `LoadGroup` values.

**Step 4: Add k segment table**

Support constant and linear modes.

**Step 5: Test disabled behavior**

Verify disabled calibration cannot be edited but YAML can still be generated with contract-compatible placeholder structure.

**Step 6: Commit**

```bash
git commit -m "feat(ui): add pressure calibration form"
```

### Task 10: Implement YAML Serializer

**Files:**
- Create: `features/input-yaml/serialization/toInputsYaml.ts`
- Test: `features/input-yaml/serialization/toInputsYaml.test.ts`

**Step 1: Serialize FormState to Inputs object**

Map all UI fields into the current backend contract.

**Step 2: Serialize Inputs object to YAML text**

Preserve field order matching `configs/example_input.yaml`.

**Step 3: Add fixture-based test**

Use values matching `configs/example_input.yaml` and verify output shape.

**Step 4: Verify excluded UI fields**

Project metadata and static friction must not appear in generated YAML.

**Step 5: Commit**

```bash
git commit -m "feat(ui): serialize form state to input yaml"
```

### Task 11: Add YAML Preview and Validation Result UI

**Files:**
- Create/modify: preview rail components
- Test: preview rail tests

**Step 1: Add read-only YAML preview**

Update preview whenever FormState changes.

**Step 2: Add S1 validation result panel**

Render:
- no validation run
- validation passed
- validation failed
- backend unavailable

**Step 3: Add field jump support where possible**

Clicking known errors focuses the corresponding field.

**Step 4: Commit**

```bash
git commit -m "feat(ui): add yaml preview and validation panel"
```

### Task 12: Add Import and Export UI

**Files:**
- Create/modify: import/export components
- Test: import/export tests

**Step 1: Add import button**

Accept `.yaml` / `.yml` files.

**Step 2: Add import state placeholder**

Actual parsing may call backend in the backend plan; for frontend MVP, define the UI states and error display.

**Step 3: Add export filename generation**

Use:

```text
{projectCode}_input_{YYYYMMDD_HHmm}.yaml
```

**Step 4: Test filename generation**

Verify project code and timestamp are included.

**Step 5: Commit**

```bash
git commit -m "feat(ui): add yaml import and export controls"
```

### Task 13: End-to-End UI Acceptance

**Files:**
- Test: browser or component integration tests

**Step 1: Fill the example input through the UI**

Use values from `configs/example_input.yaml`.

**Step 2: Generate YAML**

Expected: YAML includes current `Inputs` fields and excludes metadata.

**Step 3: Validate with backend once available**

Expected: S1 validation passes.

**Step 4: Check responsive layout**

Verify desktop layout first. Mobile can be lower priority for this engineering tool.

**Step 5: Commit**

```bash
git commit -m "test(ui): cover input yaml workbench flow"
```

---

## Acceptance Criteria

The frontend UI plan is complete when:

- Operators can fill all required current `Inputs` fields without writing YAML.
- The UI clearly separates metadata fields from YAML fields.
- Control-section count `3` generates six bogie rows in bogie-control mode.
- Powered/trailer bogie static mass and bogie weight are both visible.
- AW0/AW2/AW3 static mass fields are always visible and required.
- FSB and EB are always present.
- Calibration fields are disabled when calibration is off.
- The YAML preview matches the current contract shape.
- Export filename includes project code and timestamp.
- S1 validation results can be displayed in the UI.

## Open Questions Before Implementation

1. Where should the frontend app live: `frontend/`, `src/brake_calc/ui/`, or another approved location?
2. Should the first implementation use a production frontend stack, or a static HTML prototype first?
3. Should disabled calibration serialize example placeholder values from `configs/example_input.yaml`, or should backend contract be relaxed later so disabled calibration can omit entries?

## Suggested Next Plan

After this frontend UI plan is approved, write:

```text
docs/plans/2026-04-23-input-yaml-sqlite-storage.md
```

That plan should define SQLite tables, versioning, search fields, config history, import/export records, and how UI-only fields are persisted separately from `input.yaml`.
