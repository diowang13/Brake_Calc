# AGENTS.md

# [AGENTS.md](http://AGENTS.md) — brake-calc

## 1. 项目定位

本仓库实现城轨列车**制动压力标准计算**的确定性工作流：给定列车参数与制动需求，输出按 `load_group × brake_type × controller` 组织的压力标准矩阵，并在 S9 汇总理论速度检查、动态载荷/空簧压力、控制器开发参数、停放制动力校核、自动调整记录和 Markdown 报告。

- **Report / Markdown 稳定口径**：
    - Markdown 主标题结构固定为 `Summary / Key Tables / Checks / Controller Development Parameters`
    - `Pressure / Dynamic Load Matrix` 使用紧凑矩阵，同时展示动态载荷、空簧压力和各制动类型 BCP
    - `Calibration Summary` 是控制器开发主视图，必须展示最终生效的 `BCP0`、`BCP0_for_code`、分段 `k_for_code` 公式与分段曲线图
    - `delta_BCP` 结构化字段保留兼容，但不作为 Markdown 主视图展示
    - 停放制动力校核中：`F_N_PB` 表示单个制动单元闸片/瓦块双侧作用力，`F_PB` 表示每车停放制动力，`whole_train` 表示整列汇总力；`Lpi` / `Lo` 仍表示机械倍率，`2 * Rf / Dw` 仅表示夹钳制动几何换算项；按 `parking_brake_check.environment.grade_by_load_group` 输出逐载荷组结果，并保留 `parking_brake_check_result` 兼容字段

- **业务真相源**：[城轨制动计算 Workflow Spec（v1.0 草案）](https://www.notion.so/Workflow-Spec-v1-0-495ad4a24779422ca99d9830f40b68e1?pvs=21)（也镜像在 `specs/Brake_Calc_ Workflow_Spec_v1.0.md`）。代码实现必须与 spec 一致，发现歧义先澄清 spec 再改代码。
- **运行形态**：
    - 本地：通过 CLI / `python -m brake_calc` 跑调试
    - 云端：Hermes 直接 `import brake_calc.workflow.runner` 调用
- **V1 功能范围**：
    - 支持架控与车控两类控制器
    - 支持 `FSB`、`EB`、`FB`、`ratio_of_FSB`
    - 支持踏面制动与制动夹钳两类基础制动模型
    - 支持试验点驱动的压力标定
    - 支持停放制动力校核
    - 支持全局黏着限制与自动策略调整
    - 支持电制动特性输入预留（当前不参与主制动计算）
- **V1 契约原则**：`input.yaml` 在 V1 冻结后，不允许随意改字段名、字段形状、单位和枚举值；如需调整，必须先更新 spec，并经过人工确认。

## 2. 目录结构（只读约定）

```
src/brake_calc/
  contracts/   # pydantic 数据契约（Inputs / Context / Report），对应 spec §4、§5
  modules/     # s1..s9 工作流模块，一个文件一个模块，入口函数固定 run(ctx) -> ctx
  domain/      # 纯计算函数（运动学、质量模型、分配、机械模型、k(f) 校准、停放制动力校核、报告派生量）
  workflow/    # runner + workflow.yaml（执行顺序，对应 spec §8）
  io/          # 配置加载、YAML/Markdown 报表输出
  app/         # 后续 Web API / Hermes tool 服务层
  storage/     # 后续 SQLite/SQL 持久化层
  cli.py       # 本地命令行入口
configs/       # 示例输入、pressure_calibration 标定配置、项目配置
tests/         # unit + integration + fixtures
specs/         # 业务 spec（唯一真相源）
docs/plans/    # 设计、V1 契约冻结和实施计划
```

**Agent 不得擅自**：新增顶层目录、把 `domain/` 里的纯函数依赖改成有副作用、绕过 `contracts/` 直接用 dict 传 context。

## 3. 技术栈与依赖

- Python: **3.11+**（`.python-version` 固定）
- 包管理：**uv**（`uv sync` 安装，`uv run` 执行）
- 数据契约：**pydantic v2**
- 数值计算：**numpy**（仅在 `domain/` 用；`contracts/` 保持纯 pydantic）
- 单位处理：字段注释里写明单位，统一在 `validate_inputs` 归一化（不引入 `pint` 以保持轻量）
- 配置文件：**YAML**（`ruamel.yaml` 或 `pyyaml`）
- Web / API：后续云端服务可增加 Web 前端和 Hermes skill/tool 调用层，但必须建立在已冻结的输入契约之上
- 持久化：后续配置存储采用 SQLite/SQL，项目元数据与 `input.yaml` 分开保存
- 测试：**pytest** + **pytest-cov**
- 静态检查：**ruff** + **mypy**（strict 模式）

## 4. 运行与调试命令

```bash
# 安装依赖
uv sync

# 跑示例配置
uv run python -m brake_calc run --config configs/example_input.yaml

# 跑示例配置并导出 Markdown 报告
uv run python -m brake_calc run --config configs/example_input.yaml --markdown-output out/report.md

# 单测
uv run pytest tests/unit

# 集成测试（含 Mathcad 范例比对）
uv run pytest tests/integration

# 静态检查
uv run ruff check src tests
uv run mypy src

# 全部检查（提交前必须通过）
uv run ruff check src tests && uv run mypy src && uv run pytest
```

## 5. 编码约定

### 5.1 模块签名

每个 `src/brake_calc/modules/sN_*.py` 必须导出一个 `run`：

```python
from brake_calc.contracts.context import Context

def run(ctx: Context) -> Context:
    """一句话说明，对齐 spec §6 中对应模块的"作用"。"""
    ...
```

- **Context 是 append-only**：只能新增字段，不得修改/删除上游已写字段（pydantic `model_copy(update=...)`）
- 不在 `modules/` 里写复杂数值算法；调用 `domain/` 里的纯函数
- 抛异常用 `brake_calc.errors` 里的自定义类型；非致命问题写入 `ctx.warnings`；自动调整（如超黏着改等黏着、FB 压力超过 EB 后自动提高 `BCP0_EB`）必须单独进入结构化结果
- S9 / report 属于 V1 稳定对外交付面：未经 spec 更新和人工确认，不得擅自改动 report 字段语义、Markdown 标题层级、停车校核口径或标定摘要展示口径


### 5.2 命名与单位

- 字段名与 spec §5.2 清单**严格一致**（`Beta_list`、`F_by_controller`、`BCP_calibrated_by_controller` 等）
- 所有数值字段在 pydantic 模型里用 `Field(..., description="单位: kN")` 注明单位
- 能用枚举就不用字符串：`ControllerType = Literal["bogie", "car"]`、`BogieType = Literal["powered_bogie", "trailer_bogie"]`、`CarType = Literal["powered_car", "trailer_car"]`、`AllocationStrategy = Literal["equal_wear", "equal_adhesion"]`


### 5.3 风格

- 类型注解必填，mypy strict 通过
- 函数 docstring 用中文；代码标识符、commit message 用英文
- 行宽 100，ruff 默认规则 + `I`（import 排序）+ `N`（命名）

## 6. 测试约定

- **单测**：每个 module 一个 `test_sN_*.py`，覆盖正常路径 + spec 中明确的边界规则（EB/FB 强制等黏着、AW2 fallback、clamp 触发、超黏着自动切换、FB 压力超过 EB 后自动调整等）
- **集成测试**：`tests/integration/test_workflow_end_to_end.py` 覆盖端到端 workflow，至少包含一个 V1 example input 主路径
- **契约测试**：pydantic 模型的 schema 快照进 `tests/fixtures/schemas/`，改契约时 snapshot diff 必须人工确认
- **新增 V1 功能必须补测试**：车控、FB、caliper_cylinder、pressure_calibration 新结构、parking_brake_check、adhesion、electric_brake 输入预留
- **report / Markdown 相关改动必须补测试**：至少覆盖 `test_report_domain.py`、`test_s9_summarize_and_checks.py`、`test_report_output.py` 中受影响场景，重点校验停车校核粒度、`aw3_aw0 / aw3_aw2` 标定摘要、最终 `BCP0_for_code`、Markdown 标题结构与主视图内容
- 新增/修改功能前先写/改测试；PR 里测试先行


## 7. Agent 工作流（给 Codex / Claude 看）

做任何代码改动前，**按此顺序**：

1. **读 spec**：`specs/Brake_Calc_ Workflow_Spec_v1.0.md` 对应章节（不是 Notion 链接；本地文件是权威副本）
2. **读 V1 计划/契约冻结文档**：如存在 `docs/plans/2026-04-24-v1-contract-and-feature-upgrade.md`，先对照该文档确认当前 feature 的边界
3. **读契约**：`src/brake_calc/contracts/` 相关字段
4. **读相邻模块**：上下游 `run()` 的输入输出，确认字段名/形状一致
5. **改代码**
6. **跑检查**：`ruff + mypy + pytest`（见 §4）
7. **不允许跳过测试直接提交**

### 禁止事项

- ❌ 不得修改 `specs/` 下的文件，除非当前任务明确要求做文档回写且已经过人工确认
- ❌ 不得在 `modules/` 里硬编码单位换算或常数；放到 `domain/` 或 `configs/`
- ❌ 不得绕过 `Context`，用全局变量/模块级状态在模块间传数据
- ❌ 不得用 `print` 做日志；统一 `logging`，模块内 `logger = logging.getLogger(__name__)`
- ❌ 不得把 Mathcad 范例的数值硬写进实现里当做"正确答案"；它只在测试 fixture 里出现
- ❌ 不得在 V1 输入契约冻结后，未经 spec 更新和人工确认，擅自修改 YAML 字段名、字段形状、单位或枚举值
- ❌ 不得在前端、数据库、后端 API 中自行发明与 `Inputs` 不一致的字段结构
- ❌ 不得把自动调整后的“实际计算配置”覆盖用户原始输入；原始输入必须保留，自动调整必须单独记录
- ❌ 不得让 `electric_brake` 在 V1 中直接参与主制动计算；它当前仅作为输入预留和展示摘要
- ❌ 不得为追求“更好看”的文档或前端展示，擅自改动已验收的 report/Markdown 口径：包括停车校核字段语义、`Calibration Summary` 主视图内容、`delta_BCP` 的兼容定位、以及 Markdown 四段标题结构


### 任务分解建议


长任务按以下顺序分步：

1. 先冻结或更新 `specs/Brake_Calc_ Workflow_Spec_v1.0.md` 中对应章节，再同步 `contracts/inputs.py`
2. 先补契约测试与 schema snapshot，再实现 domain / modules
3. 按 feature 分批实现并验证，例如：控制器类型与 brake_type → 机械模型 → 标定 → 校核 → 报告
4. 最后跑集成测试，对齐 example YAML 与 Mathcad 范例
5. 在 V1 输入契约冻结前，不开始正式前端、数据库和后端 API 开发


## 8. 提交规范

- 分支：`feat/sN-<brief>`、`fix/<brief>`、`docs/<brief>`、`refactor/<brief>`
- Commit：**Conventional Commits**
    - `feat(s3): implement response_compensation with t1/t2 integration`
    - `fix(s8): guard k(f) out-of-range fallback`
    - `docs(spec): clarify allocation_strategy rule for FB`
- PR 描述必须包含：
    - 对应 spec 章节（如"实现 §6 s5"）
    - 改动摘要
    - 测试结果截图/日志

## 9. Hermes 部署注意

- 入口：本地计算入口为 `brake_calc.workflow.runner.run_workflow(inputs: Inputs) -> Report`
- 云端：后续同时支持 Web 后端服务调用与 Hermes skill/tool 调用
- 不依赖本地文件系统；配置可由调用方直接构造 `Inputs` 对象，或由后端从持久化配置中加载
- `trace` 字段由 runner 写入；Hermes 侧可选择落盘或只返回摘要
- Markdown 报告由本地 CLI / I/O 层按需导出；云端优先返回结构化 `Report`，Markdown 作为派生输出
- 日志用结构化 JSON（`logging.Formatter` 输出 JSON 行），方便云端采集


## 10. 需要人类确认的场景

以下情况 agent **必须停下来问人**，不要擅自决定：

- spec 里某规则表述与现有实现冲突
- 新增 brake_type 类型（除 spec 已列出的 FSB/EB/FB/ratio_of_FSB）
- 修改 Context 字段命名或形状
- 引入新的三方依赖
- 改动 `workflow.yaml` 的执行顺序
- 新增或修改 `input.yaml` 顶层字段、枚举值、单位或嵌套结构
- 调整 V1 已冻结输入契约的兼容性策略（例如字段改名、删除字段、改变字段含义）
- 将当前仅作输入预留的功能（如 electric_brake）接入主制动计算


---

> 本文件是仓库层面的 agent 规则；业务逻辑请查阅 `specs/Brake_Calc_ Workflow_Spec_v1.0.md`。
> 

> 两份文档有冲突时，**spec 为准**，并在 PR 里提出更新本文件。
>
