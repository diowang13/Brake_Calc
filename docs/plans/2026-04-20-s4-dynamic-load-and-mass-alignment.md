# S4 Dynamic Load And Mass Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 `s4 calc_dynamic_load_and_mass` 与更新后的业务建模对齐：基于逐转向架实例、类型级质量参数、转向架自重和空簧线性特性，正确产出质量向量、空簧压力标准和空簧拟合公式。

**Architecture:** 保留 `Context.Mass_by_controller[load_group][controller] -> {mass_static, mass_dynamic}` 这一既有主张量形状，同时扩展 `s4` 负责两类新增中间量：一是基于 `mass_static - bogie_weight` 反算得到的空簧压力标准，二是用于调试追溯的空簧线性公式。`controller` 的来源继续采用 `vehicle_config.bogies[*].name`，类型级参数由 `bogie_type` 映射读取。外部质量输入按 `ton` 表达，内部在 `s1` 统一归一化；空簧模型统一收敛为单条直线 `pressure_kpa = k * sprung_mass_ton + b`，支持“特征点整体线性拟合”与“人工显式输入 k/b”两种来源。

**Tech Stack:** Python 3.11+, pydantic v2, pytest, uv, ruff, mypy

---

## 审查结论摘要

### 当前已确认问题

- `src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py` 仍访问旧字段：
  - `inputs.vehicle_config.controllers`
  - `inputs.mass_params.controllers[controller.name]`
- 当前 `src/brake_calc/contracts/inputs.py` 已切换为新形状：
  - `vehicle_config.bogies[*].name`
  - `vehicle_config.bogies[*].bogie_type`
  - `mass_params.powered_bogie`
  - `mass_params.trailer_bogie`
- `configs/example_input.yaml` 已使用新形状，因此 `s4` 当前实现与实际输入直接不兼容。
- `tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py` 仍断言 `C1`，单测还停留在旧 controller 语义。

### 当前已明确、可直接据此实现的规则

- 每个 bogie 实例当前阶段视为一个 controller。
- `Mass_by_controller` 的 shape 继续保留为：
  - `Mass_by_controller[load_group][controller] = {"mass_static": ..., "mass_dynamic": ...}`
- `controller` key 在当前阶段应取 `vehicle_config.bogies[*].name`。
- `mass_static` 继续保留为设计输入，语义为“整架静态质量”，来源于外部称重文件。
- `bogie_weight` 需要加入 `mass_params.powered_bogie` / `mass_params.trailer_bogie`，外部输入单位至少为 `ton`。
- `mass_static`、`bogie_weight` 与 `rotational_mass_factor` 必须由 `bogie.bogie_type` 到 `mass_params.<bogie_type>` 读取。
- 簧上质量计算规则为：`sprung_mass = mass_static - bogie_weight`。
- `air_spring` 不再直接输入 AW0/AW2/AW3 压力结果，而是输入空簧线性特性。
- 空簧线性特性支持两种来源：
  - 特征点输入，程序整体线性拟合得到 `k`、`b`
  - 人工显式输入 `airspring_k`、`airspring_b`
- 即使输入多个空簧特征点，也只做单条直线整体拟合，不做分段线性。
- `s4` 需要显式输出：
  - 每个载荷组/控制器的空簧压力标准
  - 每类转向架采用的空簧线性公式 `k`、`b`
- 动态质量公式继续沿用 `src/brake_calc/domain/mass.py`：
  - `mass_dynamic = mass_static * (1 + rotational_mass_factor)`

### 仍需保持显式记录的假设

- 本阶段继续采用“一个 bogie 实例对应一个 controller”的业务假设。
- `mass_static` 仍是质量主输入，`air_spring` 在 `s4` 中承担“由质量反算压力标准和拟合公式”的职责，而不是由压力反推质量。
- 空簧线性公式按 `pressure_kpa = k * sprung_mass_ton + b` 解释，其中自变量保持业务量纲 `ton`，便于调试核对。

### 需要人确认

- `Mass_by_controller` 是否需要额外带出 `bogie_type` 作为调试字段；当前 `spec` 未要求，本计划默认不加。
- 空簧拟合结果按 `bogie_type` 存储还是按 controller 实例存储；本计划默认按 `bogie_type` 存储，因为空簧特性是类型级参数。

## 范围控制

### 本计划包含

- 修正 `s4` 对新输入契约的字段访问。
- 扩展 `mass_params` 的业务建模，引入 `bogie_weight`。
- 扩展 `air_spring` 的业务建模，支持“特征点拟合”与“显式 k/b”两种输入形式。
- 明确外部质量单位采用 `ton`，并要求在 `s1` 完成单位归一化。
- 在 `s4` 增加空簧压力标准与空簧线性公式两个显式中间输出。
- 更新 `s4` 单测，使其验证新业务语义。
- 补齐 `s4` 关键覆盖用例。
- 复核 `s5` 及其测试是否仅依赖 `Mass_by_controller` shape，而不依赖旧 `C1/C2` 命名。
- 更新相关文档描述，避免继续传播旧 controller 形状。

### 本计划不包含

- 修改 `specs/` 下文件。
- 重构 `s5~s9` 业务逻辑。
- 调整 `Context` 的 `Mass_by_controller` shape。

## 实施任务

### Task 1: 固化 `s4` 审查基线

**Files:**
- Modify: `docs/plans/2026-04-20-s4-dynamic-load-and-mass-alignment.md`
- Check: `specs/Brake_Calc_ Workflow_Spec_v1.0.md`
- Check: `docs/plans/2026-04-20-input-contract-review-round-2.md`
- Check: `configs/example_input.yaml`
- Check: `src/brake_calc/contracts/inputs.py`
- Check: `src/brake_calc/contracts/context.py`
- Check: `src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py`
- Check: `src/brake_calc/domain/mass.py`
- Test: `tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py`

**Step 1: 整理当前审查结论**

把以下内容写进本计划文档：

- `s4` 当前仍依赖旧 `controllers` 形状
- 新契约已切到 `bogies + bogie_type + 类型级 mass_params`
- `Mass_by_controller` 的 shape 可保留，但 key 语义需更新
- `air_spring` 当前未参与计算，需保持显式假设
- `mass_static` 继续作为外部称重输入保留
- `bogie_weight` 需要作为类型级参数加入 `mass_params`
- `air_spring` 改为输入线性特性，而不是直接输入 AW 压力结果
- `s4` 需要新增空簧压力标准和空簧拟合公式输出

**Step 2: 人工复核，不写代码**

Run: `rg -n "controllers|Mass_by_controller|bogie_type|mass_params" src tests`
Expected: 能定位 `s4`、`s5`、`workflow.yaml` 和旧测试中的遗留引用

**Step 3: 不提交**

这一任务只更新计划文档，不做 commit。

### Task 2: 先写 `s4` 的失败测试，锁定新输入语义

**Files:**
- Modify: `tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py`
- Check: `tests/unit/contracts/test_inputs.py`

**Step 1: 写失败测试**

至少补成以下覆盖：

```python
def test_s4_uses_bogie_name_as_controller_key() -> None:
    ...
    assert "powered_bogie_1" in out.Mass_by_controller["AW0"]
    assert "trailer_bogie_1" in out.Mass_by_controller["AW0"]


def test_s4_reads_mass_params_by_bogie_type() -> None:
    ...
    assert out.Mass_by_controller["AW0"]["powered_bogie_1"]["mass_static"] == 10000.0
    assert out.Mass_by_controller["AW0"]["trailer_bogie_1"]["mass_static"] == 9000.0


def test_s4_calculates_dynamic_mass_with_type_specific_rotational_factor() -> None:
    ...
    assert out.Mass_by_controller["AW0"]["powered_bogie_1"]["mass_dynamic"] == 10800.0
    assert out.Mass_by_controller["AW0"]["trailer_bogie_1"]["mass_dynamic"] == 9360.0


def test_s4_calculates_sprung_mass_from_mass_static_minus_bogie_weight() -> None:
    ...
    assert out.AirSpringPressure_by_controller["AW0"]["powered_bogie_1"] == ...


def test_s4_supports_air_spring_fit_from_points() -> None:
    ...
    assert out.AirSpringFit_by_bogie_type["powered_bogie"]["source_mode"] == "fitted_from_points"
    assert out.AirSpringFit_by_bogie_type["powered_bogie"]["k"] == ...


def test_s4_supports_explicit_air_spring_linear_formula() -> None:
    ...
    assert out.AirSpringFit_by_bogie_type["trailer_bogie"]["source_mode"] == "explicit_linear"
    assert out.AirSpringFit_by_bogie_type["trailer_bogie"]["b"] == ...
```

**Step 2: 运行单测确认失败**

Run: `uv run pytest tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py -v`
Expected: FAIL，原因包括旧 `controllers` 访问、缺少 `bogie_weight` 或缺少空簧新输出

**Step 3: 不提交**

此时保留失败状态，进入实现。

### Task 3: 以最小改动修正 `s4` 实现

**Files:**
- Modify: `src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py`
- Modify: `src/brake_calc/contracts/context.py`
- Modify: `src/brake_calc/contracts/inputs.py`
- Check: `src/brake_calc/contracts/inputs.py`
- Check: `src/brake_calc/domain/mass.py`

**Step 1: 写最小实现**

实现原则：

- 遍历 `inputs.vehicle_config.bogies`
- 根据 `bogie.bogie_type` 选择：
  - `inputs.mass_params.powered_bogie`
  - `inputs.mass_params.trailer_bogie`
- 用 `bogie.name` 作为 `Mass_by_controller[load_group]` 下的 key
- 用 `mass_static - bogie_weight` 求 `sprung_mass`
- 根据 `air_spring` 输入模式得到线性公式：
  - `fitted_from_points`
  - `explicit_linear`
- 用统一公式计算空簧压力：
  - `pressure_kpa = k * sprung_mass_ton + b`
- 保留输出结构：

```python
{
    "mass_static": static_mass,
    "mass_dynamic": calc_dynamic_mass(static_mass, rotational_mass_factor),
}
```

同时新增输出：

```python
AirSpringPressure_by_controller[load_group][controller] = pressure_kpa
AirSpringFit_by_bogie_type[bogie_type] = {
    "k": ...,
    "b": ...,
    "source_mode": ...,
}
```

**Step 2: 保持职责边界**

- `mass_static` 仍作为主输入，不改成由 `air_spring` 反推
- 不修改 `s5~s9` 的业务逻辑
- 仅为 `s4` 增加必要的显式中间量

**Step 3: 运行 `s4` 单测确认通过**

Run: `uv run pytest tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py -v`
Expected: PASS

**Step 4: Commit**

```bash
git add tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py docs/plans/2026-04-20-s4-dynamic-load-and-mass-alignment.md
git commit -m "fix(s4): align dynamic mass calculation with bogie inputs"
```

### Task 4: 检查 `s5` 是否只需跟进 key 语义

**Files:**
- Check: `src/brake_calc/modules/s5_calc_required_brake_force.py`
- Modify: `tests/unit/modules/test_s5_calc_required_brake_force.py`
- Modify: `tests/unit/modules/test_s6_allocate_brake_force.py`
- Modify: `tests/unit/modules/test_s7_force_to_pressure_base.py`
- Modify: `tests/unit/modules/test_s8_apply_k_calibration.py`
- Modify: `tests/unit/modules/test_s9_summarize_and_checks.py`

**Step 1: 先读，不改逻辑**

确认 `s5` 是否只依赖：

- `ctx.Mass_by_controller[load_group].items()`
- `values["mass_static"]`
- `values["mass_dynamic"]`

如果仅依赖这些，则说明 `s4` 改动不会要求重写 `s5` 逻辑，只需更新测试中的旧 key 断言。

**Step 2: 更新受影响测试**

把所有基于 `C1/C2` 的断言切到新 key 语义，例如：

```python
assert result["powered_bogie_1"] == ...
```

**Step 3: 运行聚焦回归**

Run: `uv run pytest tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py tests/unit/modules/test_s5_calc_required_brake_force.py tests/unit/modules/test_s6_allocate_brake_force.py tests/unit/modules/test_s7_force_to_pressure_base.py tests/unit/modules/test_s8_apply_k_calibration.py tests/unit/modules/test_s9_summarize_and_checks.py -v`
Expected: `s4` 相关命名语义通过；如果有失败，优先判断是旧测试断言残留还是下游真实逻辑依赖旧 controller 形状

**Step 4: Commit**

```bash
git add tests/unit/modules/test_s5_calc_required_brake_force.py tests/unit/modules/test_s6_allocate_brake_force.py tests/unit/modules/test_s7_force_to_pressure_base.py tests/unit/modules/test_s8_apply_k_calibration.py tests/unit/modules/test_s9_summarize_and_checks.py
git commit -m "test: update downstream module assertions for bogie controller keys"
```

### Task 5: 修正文档与流程描述中的旧语义

**Files:**
- Modify: `src/brake_calc/workflow/workflow.yaml`
- Modify: `tests/unit/contracts/test_context.py`

**Step 1: 修正 `workflow.yaml` 文案**

把 `s4` 的描述从旧的“控制器 car_type”改成与现行 spec 一致的表述，例如：

```yaml
desc: 按 AW0/AW2/AW3 和转向架类型计算质量向量、空簧压力标准与空簧拟合公式
```

同时检查 `s5` 文案里是否仍残留 `FB` 等旧术语；若只是文案残留，可一并更正，不改执行顺序。

**Step 2: 更新 context 相关测试样例**

如果 `tests/unit/contracts/test_context.py` 仍使用 `C1` 作为示例 key，把它替换为新的 bogie/controller 名称，确保测试样例不再传播旧语义。

**Step 3: 运行文档/契约相关验证**

Run: `uv run pytest tests/unit/contracts/test_context.py tests/unit/test_scaffold.py -v`
Expected: PASS

**Step 4: Commit**

```bash
git add src/brake_calc/workflow/workflow.yaml tests/unit/contracts/test_context.py
git commit -m "docs(workflow): remove legacy controller shape wording"
```

### Task 6: 运行本阶段完整验证

**Files:**
- Check: `src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py`
- Check: `tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py`

**Step 1: 跑静态检查**

Run: `uv run ruff check src tests`
Expected: PASS

**Step 2: 跑类型检查**

Run: `uv run mypy src`
Expected: PASS

**Step 3: 跑本阶段聚焦测试**

Run: `uv run pytest tests/unit/contracts/test_inputs.py tests/unit/contracts/test_context.py tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py tests/unit/modules/test_s5_calc_required_brake_force.py tests/unit/modules/test_s6_allocate_brake_force.py tests/unit/modules/test_s7_force_to_pressure_base.py tests/unit/modules/test_s8_apply_k_calibration.py tests/unit/modules/test_s9_summarize_and_checks.py -v`
Expected: PASS

**Step 4: 如通过，再考虑扩大范围**

Run: `uv run pytest tests/unit -v`
Expected: PASS；如失败，优先判断是否还有旧 controller 命名残留

**Step 5: Commit**

```bash
git add src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py tests/unit/modules/test_s4_calc_dynamic_load_and_mass.py src/brake_calc/workflow/workflow.yaml tests/unit/contracts/test_context.py
git commit -m "fix(s4): complete dynamic mass alignment rollout"
```

## 风险与回退点

- 最大风险不是公式，而是“旧 controller 命名”在下游测试和文档里仍有残留。
- 另一个核心风险是空簧输入模式变更会影响 `inputs.py`、schema 快照和示例配置，不再是 `s4` 单文件改动。
- 若 `s5` 之后的失败只来自断言 key 名不一致，按测试修正处理，不要误判为需要重构业务逻辑。
- 若发现任一模块把 controller 当成比 bogie 更高层级的聚合实体，需暂停并回到“需要人确认”。
- 若实现过程中发现单一 `AirSpringFit_by_bogie_type` 无法满足实例差异，应暂停并回到“需要人确认”。

## 完成标准

- `s4` 能基于 `bogies + bogie_type + 类型级 mass_params` 正常产出 `Mass_by_controller`
- `s4` 能基于 `mass_static - bogie_weight` 正确计算簧上质量
- `s4` 能输出 AW0/AW2/AW3 的空簧压力标准
- `s4` 能输出空簧线性公式，并区分来源是“特征点拟合”还是“显式公式”
- `Mass_by_controller` 保持原 shape，不引入额外结构破坏
- `s4` 聚焦单测通过
- 受影响的下游模块测试通过
- `ruff`、`mypy`、相关 `pytest` 通过
- 仓库内不再存在把 `s4` 输入写成 `vehicle_config.controllers` / `mass_params.controllers` 的活动实现
