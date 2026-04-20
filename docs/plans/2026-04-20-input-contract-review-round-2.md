# 第二轮：输入契约与业务形状审查结论

日期：2026-04-20

适用范围：
- `s1 validate_inputs`
- `src/brake_calc/contracts/inputs.py`
- `configs/example_input.yaml`

相关文件：
- [AGENTS.md](D:/codeX/Brake_Calc_Agent/Brake_Calc/AGENTS.md)
- [Brake_Calc_ Workflow_Spec_v1.0.md](D:/codeX/Brake_Calc_Agent/Brake_Calc/specs/Brake_Calc_%20Workflow_Spec_v1.0.md)
- [inputs.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/contracts/inputs.py)
- [context.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/contracts/context.py)
- [report.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/contracts/report.py)
- [example_input.yaml](D:/codeX/Brake_Calc_Agent/Brake_Calc/configs/example_input.yaml)

## 1. 目标

本轮不扩展功能，不优先改实现，重点确认当前最小闭环的输入/输出设计是否符合业务预期，并为后续按工作流逐模块调试提供稳定入口。

本结论以输入契约为主，尤其关注：
- `requirement`
- `response_time`
- 转向架/控制器建模方式
- `mech_params`
- `k` 与 `k_config`
- 压力限制输入

## 2. 当前实现中的主要问题

### 2.1 `s1` 目前只是重复校验，没有承担输入归一化职责

[s1_validate_inputs.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/modules/s1_validate_inputs.py) 目前只是在已有 `validated_inputs` 上再次执行 `Inputs.model_validate(...)`。

当前问题：
- 没有做“业务输入形状 -> 内部计算形状”的整理
- 没有承担默认值补齐和归一化职责
- 后续如果需要把输入整理为统一的内部结构，`s1` 应作为入口承接

### 2.2 当前输入仍以匿名 `controller` 为中心，不符合业务表达

[inputs.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/contracts/inputs.py) 目前仍使用：
- `vehicle_config.controllers`
- `mass_params.controllers`
- `mechanical_gain_by_controller`

默认示例和测试数据也仍然使用 `C1` / `C2` 命名。

该设计问题：
- 名称缺少业务语义
- 不利于使用者理解“动力转向架 / 拖车转向架”
- 与后续逐转向架配置 AW 工况载荷的需求不一致

## 3. 已确认的输入设计决议

### 3.1 外部输入按“逐转向架实例”建模

正式输入不再使用 `C1` / `C2` 这类匿名控制器名。

对外输入改为逐转向架实例，例如：
- `powered_bogie_1`
- `powered_bogie_2`
- `trailer_bogie_1`
- `trailer_bogie_2`

说明：
- 当前阶段只先做“转向架类型”
- 默认假设“每个转向架对应一个控制器”

### 3.2 静态质量按转向架类型配置，不再逐实例重复输入

MVP 阶段，AW 工况相关输入不采用占比建模，不采用 `load_group_shares` 作为主输入。

已确认的输入原则：
- 转向架实例只承担“编号 + 类型”的身份表达
- `mass_static_kg.AW0/AW2/AW3` 不再逐实例重复填写
- 同一 `bogie_type` 下所有实例共享同一组类型级静态质量参数

因此：
- 当前 `load_group_shares` 不适合作为 MVP 主输入
- `mass_static_kg` 应保留，但其归属层级为 `mass_params.powered_bogie` / `mass_params.trailer_bogie`

### 3.3 转向架类型只保留两类

当前阶段只保留两类 `bogie_type`：
- `powered_bogie`
- `trailer_bogie`

### 3.4 类型参数与实例参数分层

当前已确认的分层原则：

实例层：
- 转向架实例名称
- `bogie_type`

类型层：
- `powered_bogie` / `trailer_bogie` 的共性参数
- `mass_static_kg.AW0/AW2/AW3`
- `rotational_mass_factor`

其中，静态质量与 `rotational_mass_factor` 均已确认按类型层配置，不逐实例重复填写。

## 4. `requirement` 结论

当前 `requirement` 按 brake type 名称索引的总体方向可以保留，但其适用范围需要明确收紧。

本轮结论：
- `FSB` 和 `EB` 作为基础制动类型，保留 `requirement`
- `ratio_of_FSB` 类型不单独配置 `requirement`
- `ratio_of_FSB` 的目标减速度由 `FSB` 推导
- `FSB` 仅接受 `a_mean` 形式的 requirement
- `EB` 可接受 `a_mean` 或 `distance`

因此：
- `requirement` 应主要服务于 `kinematic` 类型
- 不应再把所有制动类型都视为对等 requirement 输入项
- `distance` 模式在业务上只适用于 `EB`

## 5. `brake_types` 结论

### 5.1 `FB` 暂时退出 MVP

当前业务结论：
- MVP 阶段不保留 `FB`
- 附加制动类型统一使用 `ratio_of_FSB`

### 5.2 保留具名 `ratio_of_FSB`

长期业务方向：
- 每个 `ratio_of_FSB` 实例都允许人工命名
- 用户输入“类型名 + ratio”
- 程序按 `ratio * Beta[FSB]` 推导

例如：
- `hold_brake`
- `half_service`
- 其他具名比例类型

### 5.3 `BrakeTypeSource` 后续建议收敛

后续契约应从当前：
- `kinematic`
- `copy_of_EB`
- `ratio_of_FSB`

收敛为：
- `kinematic`
- `ratio_of_FSB`

## 6. `response_time` 结论

当前统一的 `t1 + t2` 结构不符合业务规则，需要改形状。

### 6.1 `EB` 的响应时间

`EB` 需要人工输入两个响应时间：
- `t1`
- `t2`

### 6.2 `FSB` 的响应时间

`FSB` 不再人工输入 `t2`，只输入：
- `t1`
- `impulse_rate`

其中：
- `impulse_rate` 定义为减速度上升率
- 单位：`m/s^3`

程序不应将其实现为“先独立算出 `t2` 再做补偿”的顺序过程。

正确理解应为：
- `FSB` 的控制减速度与 `t2` 存在联立关系
- `t2` 由 `控制减速度 / impulse_rate` 派生
- `s3` 需要基于 `a_mean_req`、`t1`、`impulse_rate` 联立反求 `FSB` 的控制减速度
- `t2` 是求解过程中的派生量，而不是独立输入

### 6.3 `ratio_of_FSB` 的响应时间

`ratio_of_FSB` 类型不单独配置响应时间，沿用 FSB 的派生路径。

### 6.4 对契约的影响

当前统一的 `ResponseTimeEntry` 不再适用，后续需要拆分或显式区分：
- FSB 响应参数
- EB 响应参数

## 7. `mech_params` 与 `k` 的结论

### 7.1 `mech_params` 全列共享一套

已确认：
- `mech_params` 为全列共享参数
- 不按转向架实例配置
- 不按转向架类型配置

### 7.2 `k` 不是用户输入

已确认：
- `k` 由 `mech_params` 推导
- `k` 是内部量
- `k` 不应作为用户输入显式配置

因此，当前 `k_config.default` 的方向不正确。

### 7.3 对当前实现的影响

以下实现假设后续需要调整：
- [inputs.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/contracts/inputs.py) 中 `k_config.default` 必填
- [s7_force_to_pressure_base.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/modules/s7_force_to_pressure_base.py) 中按输入读取 `default_k`
- [s8_apply_k_calibration.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/modules/s8_apply_k_calibration.py) 中将 `default_k` 作为校准缩放基准

## 8. 压力限制输入结论

### 8.1 当前 `clamp_config` 命名和语义都不合适

当前实现中的 `clamp_config` 是按 brake type 静态配置 `min/max`。

本轮确认：
- 该命名存在歧义
- 该模型不符合 FSB / EB 的真实业务规则

### 8.2 FSB 限制规则

已确认：
- `FSB` 必须受限
- `FSB` 没有下限
- `FSB` 上限由当前载荷工况下的 `EB` 压力动态决定

即：
- `FSB max = 当前载荷组下 EB 压力`
- `FSB min = 无`

### 8.3 EB 限制规则

已确认：
- `EB` 存在上下限
- `EB max = 600`
- `EB min` 由人工输入

已确认的字段名：
- `EB_limit_min`

### 8.4 对输入契约的影响

后续方向应为：
- 退出当前通用 `clamp_config`
- 改成更贴业务的阀输出限制输入
- 真正需要输入的量只保留 `EB_limit_min`

其余限制为运行时规则：
- `EB max = 600`
- `FSB max = 当前载荷组下 EB 压力`
- `FSB min = 无`

## 9. `load_groups` 结论

字段命名保留为：
- `load_groups`

原因：
- 输入和输出都面向多个载荷工况
- 使用复数更符合矩阵式输出语义
- `load_group` 容易让人误解为单工况运行

## 10. 对 `example_input.yaml` 的直接要求

后续默认示例至少应满足：
- 不再使用 `C1` / `C2`
- 使用逐转向架实例命名
- 每个实例显式带 `bogie_type`
- `mass_static_kg` 与 `rotational_mass_factor` 按 `bogie_type` 两类配置
- `mech_params` 只保留全列共享一套
- 去掉 `FB`
- 至少保留一个具名 `ratio_of_FSB`
- 去掉 `k_config.default`
- 去掉当前通用 `clamp_config`
- 新限制输入中至少明确 `EB_limit_min`

## 11. 对后续模块审查的影响

本轮结论会直接影响以下模块的后续审查：

- `s1 validate_inputs`
  - 需要承担输入归一化与内部结构整理职责

- `s3 response_compensation`
  - 需要区分 FSB 与 EB 的响应参数结构
  - 需要基于 `a_mean_req`、`t1`、`impulse_rate` 联立求解 FSB 的控制减速度
  - 不能再保留 `FB/copy_of_EB` 的专门分支
  - `ratio_of_FSB` 的计算不应依赖 `brake_types` 输入顺序

- `s4 calc_dynamic_load_and_mass`
  - 需要由转向架实例的 `bogie_type` 去类型级 `mass_params` 读取静态质量
  - 需要按 `bogie_type` 读取旋转质量因子

- `s7 force_to_pressure_base`
  - 不能再依赖外部输入 `default_k`
  - 需要改为基于 `mech_params` 内部推导

- `s8 apply_k_calibration`
  - 需要重新审视 `k` 校准基准和压力限制逻辑
  - 需要支持“FSB 上限依赖同载荷组 EB 压力”的动态规则

## 12. 本轮结论摘要

本轮已经确认的关键决议如下：

- 输入按逐转向架实例建模
- 不再使用匿名 `C1/C2`
- AW 工况静态质量按转向架类型配置
- 只保留 `powered_bogie` / `trailer_bogie` 两类转向架类型
- `mass_static_kg` 与 `rotational_mass_factor` 按类型配置
- `mech_params` 全列共享一套
- `k` 是内部量，不再作为输入配置
- MVP 去掉 `FB`
- 附加制动类型统一采用具名 `ratio_of_FSB`
- `FSB` 响应参数为 `t1 + impulse_rate`
- `EB` 响应参数为 `t1 + t2`
- `FSB` 无下限，且上限由同载荷组 `EB` 压力决定
- `EB max = 600`
- `EB min` 输入字段名为 `EB_limit_min`
- `load_groups` 命名保留

## 13. `s3 response_compensation` 补充审查结论

### 13.1 当前实现与已确认业务规则的差异

[s3_response_compensation.py](D:/codeX/Brake_Calc_Agent/Brake_Calc/src/brake_calc/modules/s3_response_compensation.py) 当前存在以下问题：

- 所有 `kinematic` 类型统一按 `t1 + t2` 处理，不符合当前已确认的差异化规则
- 仍保留 `copy_of_EB -> Beta[EB]` 的 `FB` 分支，不符合 MVP 阶段去掉 `FB` 的结论
- `ratio_of_FSB` 当前依赖 `FSB` 已先出现在 `brake_types` 顺序中，存在隐式顺序依赖

### 13.2 已确认的 `s3` 目标规则

`s3 response_compensation` 后续应按以下规则收敛：

- `FSB`
  - 输入：`t1 + impulse_rate`
  - `t2` 由 `控制减速度 / impulse_rate` 派生
  - 由于 `t2` 与控制减速度相互依赖，程序需要基于 `a_mean_req`、`t1`、`impulse_rate` 联立求解 FSB 的控制减速度
  - `t2` 是求解过程中的派生量，不是独立输入

- `EB`
  - 输入：`t1 + t2`
  - 按完整响应时间直接做目标减速度补偿

- `ratio_of_FSB`
  - 不单独做响应补偿
  - 直接按 `ratio * Beta[FSB]` 生成

### 13.3 与当前 spec 的对齐状态

截至本轮结束，`s3` 相关的关键业务结论已经同步回 spec，包括：

- `FSB` 改为 `t1 + impulse_rate`，并明确需联立求解控制减速度
- `EB` 保持 `t1 + t2`
- MVP 中移除 `FB/copy_of_EB` 路径
- 明确 `ratio_of_FSB` 为附加制动类型的统一扩展方式

目前 spec 与本轮审查结论已基本对齐，后续可直接以更新后的 spec 作为实现和模块审查依据。

## 14. 推荐的下一步

建议继续按工作流顺序推进，下一轮优先审查：
- `s4 calc_dynamic_load_and_mass`

原因：
- 入口契约、`requirement` 与 `response_time` 的业务形状已经收敛
- 下一步最需要检查的是逐转向架实例输入如何落到 `Mass_by_controller`
