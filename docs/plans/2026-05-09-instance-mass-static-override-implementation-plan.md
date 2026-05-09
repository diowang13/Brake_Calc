# Instance Mass Static Override Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为架控/车控实例增加可选的 `mass_static_override` 与 `display_name`，并在后端计算、report 输出、前端录入和结果展示中完整支持实例级静态称重覆盖。

**Architecture:** 保留 `mass_params` 作为类型级默认质量参数，在 `vehicle_config` 的实例项上新增可选 `mass_static_override` 和 `display_name`。后端 `s4` 仅切换 `mass_static` 的来源优先级，不改变 `bogie_weight`、`rotational_mass_factor` 和 `air_spring` 的类型级共享模型；`s9` 增加实例级动态载荷公式输出，前端实例编辑区负责覆盖录入与别名展示。

**Tech Stack:** Python 3.11+, pydantic v2, pytest, TypeScript, React, Vite, SQLite JSON storage

---

## 实施前提

1. spec 已按以下文档定稿：
   - `specs/Brake_Calc_ Workflow_Spec_v1.0.md`
2. 设计基线文档：
   - `docs/plans/2026-05-09-instance-mass-static-override-and-display-name-plan.md`

## 范围约束

本次只支持：

1. 实例级 `mass_static_override`
2. 实例级 `display_name`

本次不支持：

1. 实例级 `bogie_weight`
2. 实例级 `rotational_mass_factor`
3. 实例级 `air_spring`

## Task 1: 冻结输入契约与 schema

**Files:**
- Modify: `src/brake_calc/contracts/inputs.py`
- Modify: `tests/unit/contracts/test_inputs.py`
- Modify: `tests/fixtures/schemas/inputs.schema.json`

**Step 1: 写失败契约测试**

至少补以下测试：

```python
def test_bogie_config_allows_display_name_and_mass_static_override() -> None:
    payload = {
        "name": "trailer_bogie_1",
        "display_name": "1号拖架（司机室端）",
        "bogie_type": "trailer_bogie",
        "mass_static_override": {"AW0": 15.8, "AW2": 22.7, "AW3": 25.6},
    }
    BogieConfig.model_validate(payload)


def test_mass_static_override_requires_all_load_groups() -> None:
    with pytest.raises(ValidationError):
        BogieConfig.model_validate(
            {
                "name": "trailer_bogie_1",
                "bogie_type": "trailer_bogie",
                "mass_static_override": {"AW0": 15.8, "AW3": 25.6},
            }
        )


def test_display_name_is_optional_for_car_config() -> None:
    payload = {"name": "trailer_car_1", "car_type": "trailer_car"}
    CarConfig.model_validate(payload)
```

**Step 2: 运行失败测试**

Run: `uv run pytest tests/unit/contracts/test_inputs.py -v`

Expected:

1. 失败于 `display_name` / `mass_static_override` 字段未定义
2. schema snapshot 尚未更新

**Step 3: 最小实现契约**

在 `src/brake_calc/contracts/inputs.py`：

1. 新增 `MassStaticOverride` 模型：
   - `AW0: float`
   - `AW2: float`
   - `AW3: float`
   - 所有值 `> 0`
2. `BogieConfig` 新增：
   - `display_name: str | None = None`
   - `mass_static_override: MassStaticOverride | None = None`
3. `CarConfig` 新增：
   - `display_name: str | None = None`
   - `mass_static_override: MassStaticOverride | None = None`

**Step 4: 刷新 schema**

Run:

```powershell
@'
from pathlib import Path
from brake_calc.contracts.inputs import Inputs

target = Path("tests/fixtures/schemas/inputs.schema.json")
target.write_text(Inputs.model_json_schema_json(indent=2), encoding="utf-8")
'@ | uv run python -
```

Expected: `tests/fixtures/schemas/inputs.schema.json` 更新

**Step 5: 运行契约测试**

Run: `uv run pytest tests/unit/contracts/test_inputs.py -v`

Expected: PASS

## Task 2: 为 S4 增加实例级静态质量来源解析

**Files:**
- Modify: `src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py`
- Modify: `tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py`

**Step 1: 写失败单测**

至少补以下测试：

```python
def test_s4_prefers_bogie_mass_static_override_over_type_default() -> None:
    ...
    assert out.Mass_by_controller["AW0"]["trailer_bogie_1"]["mass_static"] == 15.8
    assert out.Mass_by_controller["AW0"]["trailer_bogie_2"]["mass_static"] == 15.3


def test_s4_keeps_shared_bogie_weight_and_air_spring_when_override_exists() -> None:
    ...
    assert out.AirSpringPressure_by_controller["AW0"]["trailer_bogie_1"] != out.AirSpringPressure_by_controller["AW0"]["trailer_bogie_2"]
    # but both still use the same trailer_bogie shared bogie_weight / air_spring
```

车控至少补 1 个：

```python
def test_s4_supports_car_mass_static_override_as_car_level_mass() -> None:
    ...
    assert out.Mass_by_controller["AW0"]["trailer_car_1"]["mass_static"] == 31.6
```

**Step 2: 运行失败测试**

Run: `uv run pytest tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py -v`

Expected: FAIL，当前实现只按 `mass_params.<type>.mass_static` 取值

**Step 3: 最小实现**

在 `s4_calc_dynamic_load_and_mass.py`：

1. 为 `_iter_controllers` 或新增 helper 返回：
   - `controller_name`
   - `bogie_type`
   - `mass_static_override | None`
2. 统一解析：
   - 默认从 `mass_params.<type>.mass_static` 取值
   - 有 override 时优先使用 override
3. `bogie_weight`、`rotational_mass_factor`、`air_spring` 仍按 `bogie_type` 读取

**Step 4: 运行单测**

Run: `uv run pytest tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py -v`

Expected: PASS

## Task 3: 为 S9 增加实例级动态载荷公式输出

**Files:**
- Modify: `src/brake_calc/modules/s9_summarize_and_checks.py`
- Modify: `src/brake_calc/contracts/report.py`
- Modify: `tests/unit/modules/test_s9_summarize_and_checks.py`
- Modify: `tests/unit/test_report_output.py`

**Step 1: 写失败测试**

至少补以下测试：

```python
def test_s9_emits_dynamic_mass_formula_by_controller_when_instances_differ() -> None:
    ...
    formula_map = out.report.controller_code_params["dynamic_mass_formula_by_controller"]
    assert "trailer_bogie_1" in formula_map
    assert "trailer_bogie_2" in formula_map
    assert formula_map["trailer_bogie_1"]["formula"] != formula_map["trailer_bogie_2"]["formula"]
```

兼容性测试：

```python
def test_s9_keeps_mass_dyn_formula_by_bogie_type_for_backward_compatibility() -> None:
    ...
    assert "trailer_bogie" in out.report.mass_dyn_formula_by_bogie_type
```

**Step 2: 运行失败测试**

Run: `uv run pytest tests/unit/modules/test_s9_summarize_and_checks.py -v`

Expected: FAIL，当前 report 不含 `dynamic_mass_formula_by_controller`

**Step 3: 最小实现**

在 `s9_summarize_and_checks.py`：

1. 新增 helper 按 controller 构造：
   - `k`
   - `b`
   - `aw0`
   - `aw3`
   - `formula`
2. 保留现有 `mass_dyn_formula_by_bogie_type`
3. 把实例级公式挂入：
   - `report.controller_code_params["dynamic_mass_formula_by_controller"]`

在 `contracts/report.py`：

1. 扩充 `controller_code_params` 允许 `dynamic_mass_formula_by_controller`
2. 不删除旧字段

**Step 4: 运行模块与 report 测试**

Run:

```powershell
uv run pytest tests/unit/modules/test_s9_summarize_and_checks.py -v
uv run pytest tests/unit/test_report_output.py -v
```

Expected: PASS

## Task 4: 接入前端实例别名与独立称重覆盖录入

**Files:**
- Modify: `frontend/src/pages/WorkbenchPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

**Step 1: 写失败前端测试**

至少补以下测试：

```tsx
it("saves display_name and mass_static_override for a bogie instance", async () => {
  ...
  expect(saved.form_state.vehicle_config.bogies[0].display_name).toBe("1号拖架（司机室端）");
  expect(saved.form_state.vehicle_config.bogies[0].mass_static_override).toEqual({
    AW0: 15.8,
    AW2: 22.7,
    AW3: 25.6,
  });
});


it("uses type default mass_static when instance override is disabled", async () => {
  ...
  expect(saved.form_state.vehicle_config.bogies[0].mass_static_override).toBeUndefined();
});
```

导入/回填至少补 1 个：

```tsx
it("backfills display_name and instance mass override from imported config", async () => {
  ...
});
```

**Step 2: 运行失败测试**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL，当前前端未保存/回填这两个字段

**Step 3: 最小实现**

在 `WorkbenchPage.tsx`：

1. 为 `BogieControllerRow` / `CarControllerRow` 增加：
   - `displayName?: string`
   - `massStaticOverrideEnabled?: boolean`
   - `massStaticOverride?: { AW0: string; AW2: string; AW3: string }`
2. 在实例编辑区新增：
   - 展示名输入
   - “启用独立称重”开关
   - AW0/AW2/AW3 输入框
3. 保存 draft 时：
   - 有别名则写 `display_name`
   - override 开启时写 `mass_static_override`
4. 导入/打开已有项目时：
   - 正确回填 `display_name`
   - 正确回填 override 开关与值

在 `App.tsx`：

1. 扩展 `applyImportedVehicleConfig`
2. 保证新建、导入、打开既有项目三条路径都能携带实例扩展字段

**Step 4: 运行前端测试**

Run: `npm test -- src/App.test.tsx`

Expected: PASS

## Task 5: 在结果页优先展示展示名并接入实例级公式

**Files:**
- Modify: `frontend/src/pages/ResultPage.tsx`
- Modify: `frontend/src/App.test.tsx`

**Step 1: 写失败测试**

至少补以下测试：

```tsx
it("prefers display_name over internal controller name in result views", async () => {
  ...
  expect(screen.getByText("1号拖架（司机室端）")).toBeInTheDocument();
  expect(screen.queryByText("trailer_bogie_1")).not.toBeInTheDocument();
});

it("renders dynamic mass formulas by controller when provided", async () => {
  ...
  expect(screen.getByText(/1号拖架（司机室端）/)).toBeInTheDocument();
  expect(screen.getByText(/mass_dyn_t =/)).toBeInTheDocument();
});
```

**Step 2: 运行失败测试**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL，当前结果页只认识内部名或类型级公式

**Step 3: 最小实现**

在 `ResultPage.tsx`：

1. 从 `runtimeFormState.vehicle_config` 解析 `name -> display_name`
2. 展示时优先 `display_name ?? name`
3. 动态质量公式区优先消费：
   - `controller_code_params.dynamic_mass_formula_by_controller`
4. 若该字段不存在，再回退到旧的类型级公式显示

**Step 4: 运行前端测试**

Run: `npm test -- src/App.test.tsx`

Expected: PASS

## Task 6: 端到端回归与兼容性验证

**Files:**
- Modify: `tests/integration/test_workflow_end_to_end.py`
- Check: `configs/example_input.yaml`

**Step 1: 写集成测试**

至少补一个配置场景：

1. 两个 `trailer_bogie` 同类型
2. 共用同一套 `bogie_weight` / `rotational_mass_factor` / `air_spring`
3. 但 `trailer_bogie_1` 与 `trailer_bogie_2` 使用不同 `mass_static_override`

断言：

1. 两个实例 `Mass_by_controller` 不同
2. 两个实例 `AirSpringPressure_by_controller` 不同
3. `controller_code_params.dynamic_mass_formula_by_controller` 两条公式都存在
4. 旧无 override 配置仍可运行

**Step 2: 运行集成测试**

Run: `uv run pytest tests/integration/test_workflow_end_to_end.py -v`

Expected: PASS

## Task 7: 全量验证

**Files:**
- Check only

**Step 1: 后端静态检查**

Run:

```powershell
uv run ruff check src tests
uv run mypy src
```

Expected: PASS

**Step 2: 后端测试**

Run:

```powershell
uv run pytest tests/unit/contracts/test_inputs.py -v
uv run pytest tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py -v
uv run pytest tests/unit/modules/test_s9_summarize_and_checks.py -v
uv run pytest tests/unit/test_report_output.py -v
uv run pytest tests/integration/test_workflow_end_to_end.py -v
```

Expected: PASS

**Step 3: 前端测试与构建**

Run:

```powershell
cd frontend
npm test -- src/App.test.tsx
npm run build
```

Expected: PASS

## 执行注意事项

1. 不要破坏旧配置兼容：
   - `display_name` 缺省必须可用
   - `mass_static_override` 缺省必须回退到类型默认值
2. 不要把 `display_name` 当内部主键
3. 不要把 `mass_static_override` 扩展到 `bogie_weight` / `rotational_mass_factor` / `air_spring`
4. 不要删除 `mass_dyn_formula_by_bogie_type`，它仍承担兼容输出职责

## 建议提交粒度

1. `feat(contracts): add instance mass override and display name`
2. `feat(s4): support instance mass_static overrides`
3. `feat(s9): emit dynamic mass formula by controller`
4. `feat(frontend): edit and render instance mass overrides and display names`
5. `test(integration): cover instance-specific mass overrides`
