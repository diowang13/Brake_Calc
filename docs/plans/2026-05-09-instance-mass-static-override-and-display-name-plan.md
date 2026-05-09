# 2026-05-09 Instance Mass Static Override And Display Name Plan

## 1. 背景与目标

当前 V1 输入契约只支持两类类型级载荷实例：

1. `powered_bogie` / `trailer_bogie`
2. `powered_car` / `trailer_car`

在现有模型下：

1. `mass_params` 仅按类型级定义 `mass_static`
2. `vehicle_config` 中的实例仅定义 `name + type`
3. 后端 `s4` 根据实例的 `bogie_type` / `car_type` 到 `mass_params` 读取同一套类型级静态质量

这与实际项目中的一类业务场景不一致：

1. 同类型实例共享相同的转向架重量、转动惯量和空簧特性
2. 但个别实例的静态称重不同
3. 例如：两个 `trailer_bogie` 实例中，`trailer_bogie_1` 因司机室或设备布置更重，`trailer_bogie_2` 更轻

本计划的目标是：

1. 保留类型级 `mass_params` 作为默认值
2. 允许个别实例定义静态称重覆盖值
3. 保持 `bogie_weight`、`rotational_mass_factor`、`air_spring` 继续按类型共享
4. 为实例提供展示别名 `display_name`
5. 在 report / 前端结果中补充实例级动态载荷公式输出

## 2. 已确认边界

### 2.1 本次允许变化

1. 只允许实例级覆盖 `mass_static`
2. 允许实例定义展示别名 `display_name`

### 2.2 本次不允许变化

以下参数继续按类型共享，不支持实例级覆盖：

1. `bogie_weight`
2. `rotational_mass_factor`
3. `air_spring`

### 2.3 车控边界

1. `controller_type = car` 时，允许整车级 `mass_static_override`
2. 不支持“一辆车内部两个 bogie 一个重一个轻”的车控建模
3. 若业务存在车内动/拖架混合或车内 bogie 差异，应继续使用架控建模

## 3. 当前实现约束

### 3.1 Spec 现状

当前 spec 已明确：

1. `mass_params` 是类型级质量参数
2. `vehicle_config` 实例仅承担 `name + type`
3. 静态质量不在实例层配置

因此本需求属于输入契约扩展，必须先改 spec，再改代码。

### 3.2 契约现状

当前 `src/brake_calc/contracts/inputs.py` 中：

1. `BogieConfig` 仅有：
   - `name`
   - `bogie_type`
2. `CarConfig` 仅有：
   - `name`
   - `car_type`
3. `MassParams` 仅有：
   - `powered_bogie`
   - `trailer_bogie`

### 3.3 后端现状

当前 `src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py`：

1. 遍历控制器实例
2. 读取实例的 `bogie_type` 或 `car_type`
3. 直接按类型从 `mass_params` 取 `mass_static`
4. 因此同类型实例必然得到同一套静态称重

### 3.4 前端现状

当前 `frontend/src/pages/WorkbenchPage.tsx`：

1. 载荷参数录入区只编辑：
   - `mass_params.powered_bogie.mass_static.*`
   - `mass_params.trailer_bogie.mass_static.*`
2. 控制器实例区只编辑：
   - `name`
   - `type`

因此前端现状也不支持实例级静态质量差异。

## 4. 推荐方案

推荐采用“类型默认值 + 个别实例覆盖”的方式：

1. 保留 `mass_params` 作为类型级默认值
2. 在 `vehicle_config` 的实例项上新增可选 `mass_static_override`
3. 在 `vehicle_config` 的实例项上新增可选 `display_name`

### 4.1 推荐的输入形状

架控示意：

```yaml
vehicle_config:
  bogies:
    - name: trailer_bogie_1
      display_name: 1号拖架（司机室端）
      bogie_type: trailer_bogie
      mass_static_override:
        AW0: 15.80
        AW2: 22.70
        AW3: 25.60
    - name: trailer_bogie_2
      display_name: 2号拖架
      bogie_type: trailer_bogie
```

车控示意：

```yaml
vehicle_config:
  cars:
    - name: trailer_car_1
      display_name: 1号拖车
      car_type: trailer_car
      mass_static_override:
        AW0: 31.60
        AW2: 45.40
        AW3: 51.20
```

### 4.2 解析规则

1. 若实例配置了 `mass_static_override`，则优先使用 override
2. 若实例未配置 `mass_static_override`，则回退到 `mass_params.<type>.mass_static`
3. `bogie_weight`、`rotational_mass_factor`、`air_spring` 一律继续按 `type` 读取
4. `display_name` 仅用于展示，不参与计算主键和实例关联

## 5. 契约设计建议

### 5.1 新增公共覆盖结构

建议新增：

```python
class MassStaticOverride(BaseModel):
    AW0: float
    AW2: float
    AW3: float
```

校验规则：

1. `AW0/AW2/AW3` 一旦启用覆盖，必须全部给出
2. 所有值必须 `> 0`

### 5.2 扩展实例配置

建议：

1. `BogieConfig` 新增：
   - `display_name: str | None = None`
   - `mass_static_override: MassStaticOverride | None = None`
2. `CarConfig` 新增：
   - `display_name: str | None = None`
   - `mass_static_override: MassStaticOverride | None = None`

### 5.3 展示名规则

1. `name` 仍为内部唯一标识
2. `display_name` 为可选展示别名
3. `display_name` 不要求唯一
4. 展示优先使用 `display_name ?? name`
5. 导出 YAML 时两者都保留

## 6. 后端改动评估

### 6.1 S4 动态载荷与空簧压力

`src/brake_calc/modules/s4_calc_dynamic_load_and_mass.py` 需要增加一层静态质量来源解析：

1. 先解析控制器实例对应的 `type`
2. 读取该实例的 `mass_static_override`
3. 若存在 override，则使用 override
4. 否则回退到 `mass_params.<type>.mass_static`

其余逻辑保持不变：

1. `bogie_weight` 仍按类型读取
2. `rotational_mass_factor` 仍按类型读取
3. `air_spring` 仍按类型读取
4. `spring_pressure` 仍按单个空簧口径输出

### 6.2 S9 汇总与结果输出

当前 `s9` 中存在两类“按 bogie_type”输出的动态质量公式：

1. `controller_code_params.dynamic_mass_formula`
2. `mass_dyn_formula_by_bogie_type`

当同类型实例存在不同 `mass_static_override` 时：

1. 同类型实例的 AW0/AW3 点将不同
2. 因而实际的 `kPa-ton` 动态质量公式也应按实例输出
3. 仅保留类型级单条公式将不再严谨

### 6.3 推荐的 report 兼容策略

建议同时做两件事：

1. 保留现有类型级字段，维持兼容
2. 新增实例级公式字段，作为新主视图来源

建议新增：

```yaml
controller_code_params:
  dynamic_mass_formula_by_controller:
    trailer_bogie_1:
      k: ...
      b: ...
      aw0:
        spring_kPa: ...
        mass_dyn_t: ...
      aw3:
        spring_kPa: ...
        mass_dyn_t: ...
      formula: ...
```

说明：

1. `dynamic_mass_formula` 和 `mass_dyn_formula_by_bogie_type` 先不删除
2. 前端结果页后续优先展示实例级公式
3. 若某类型所有实例都未使用 override，则类型级公式和实例级公式应等价

## 7. 前端交互建议

### 7.1 载荷输入区

保留现有：

1. `按整车录入`
2. `按转向架录入`

这部分仍编辑类型级默认值：

1. `mass_params.powered_bogie.mass_static.*`
2. `mass_params.trailer_bogie.mass_static.*`

### 7.2 实例配置区

在“控制器实例”区为每个实例增加两项能力：

1. `display_name`
2. `启用独立称重`

当“启用独立称重”打开时：

1. 显示该实例的 `AW0/AW2/AW3` 输入框
2. 保存到该实例的 `mass_static_override`

当关闭时：

1. 不输出 `mass_static_override`
2. 界面说明该实例使用类型默认值

### 7.3 交互原则

1. 默认场景保持简单，不强迫用户逐实例输入
2. 仅对特殊实例启用 override
3. `display_name` 只做展示，不替代内部 `name`
4. 导入已有 YAML 时，需要正确回填：
   - `display_name`
   - `mass_static_override`
   - override 开关状态

## 8. 测试影响

### 8.1 契约测试

需要更新：

1. `tests/unit/contracts/test_inputs.py`
2. `tests/fixtures/schemas/inputs.schema.json`

覆盖点：

1. `display_name` 可为空或缺省
2. `mass_static_override` 可缺省
3. `mass_static_override` 一旦给出，必须包含 `AW0/AW2/AW3`
4. override 值必须 `> 0`

### 8.2 后端单测

至少补：

1. `s4`：实例 override 优先级高于类型默认值
2. `s4`：未配置 override 时，继续使用类型默认值
3. `s4`：`bogie_weight` / `rotational_mass_factor` / `air_spring` 仍按类型共享
4. `s9`：生成 `dynamic_mass_formula_by_controller`
5. `s9`：存在 override 时，实例级公式与类型级公式可能不同

### 8.3 集成测试

至少新增一个端到端 YAML：

1. 两个 `trailer_bogie` 同类型但不同 `mass_static_override`
2. 校验：
   - `load_summary` 的质量与空簧压力不同
   - `dynamic_mass_formula_by_controller` 分别生成
   - 其余类型共享参数不变

### 8.4 前端测试

需要覆盖：

1. 实例区回填 `display_name`
2. 实例区开启/关闭 override
3. 保存后 YAML / form_state 正确生成 `mass_static_override`
4. 导入旧配置无 override 时界面仍正常
5. 结果页优先显示 `display_name`

## 9. 实施顺序建议

### Phase 1: 人工修改 spec

先由人更新：

1. `specs/Brake_Calc_ Workflow_Spec_v1.0.md`

至少补充：

1. `vehicle_config` 实例允许 `display_name`
2. `vehicle_config` 实例允许可选 `mass_static_override`
3. override 仅覆盖 `mass_static`
4. `bogie_weight`、`rotational_mass_factor`、`air_spring` 仍按类型共享
5. report 新增实例级动态质量公式输出

### Phase 2: 契约冻结

在 spec 确认后：

1. 改 `src/brake_calc/contracts/inputs.py`
2. 刷新 schema snapshot
3. 补契约测试

### Phase 3: 后端核心实现

1. 改 `s4`
2. 改 `s9`
3. 补单测和集成测试

### Phase 4: 前端录入与结果展示

1. 在实例配置区接入 `display_name`
2. 在实例配置区接入 `mass_static_override`
3. 调整结果页展示实例级公式和展示名
4. 补前端测试

## 10. 需要人确认的事项

以下事项在实现前应视为已确认：

1. 本次仅扩展 `mass_static` 的实例级覆盖，不扩展其他共享参数
2. `display_name` 为展示别名，不参与唯一性和内部主键
3. `mass_static_override` 一旦启用必须完整填写 `AW0/AW2/AW3`
4. `dynamic_mass_formula_by_controller` 需要作为正式输出新增到 report
5. 类型级动态质量公式字段先保留兼容，不立即删除

## 11. 建议的下一步

1. 先按本计划修改 spec
2. spec 定稿后，进入计划模式一次性完成契约、后端、前端和测试改动
