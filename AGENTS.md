# AGENTS.md（brake-calc 仓库模板）

<aside>
📎

这是给 `brake-calc` 仓库用的 `AGENTS.md` 初稿。把它放到仓库根目录后，Codex / Claude Code 等 agent 会自动加载。需要修改的占位符已用 `...` 标出。

</aside>

# [AGENTS.md](http://AGENTS.md) — brake-calc

## 1. 项目定位

本仓库实现城轨列车**制动压力标准计算**的确定性工作流：给定列车参数与制动需求，输出按 `load_group × brake_type × controller` 组织的压力标准矩阵，并在 S9 汇总理论速度检查、动态载荷/空簧压力、控制器开发参数和 Markdown 报告。

- **业务真相源**：[城轨制动计算 Workflow Spec（v1.0 草案）](https://www.notion.so/Workflow-Spec-v1-0-495ad4a24779422ca99d9830f40b68e1?pvs=21)（也镜像在 `specs/Brake_Calc_ Workflow_Spec_v1.0.md`）。代码实现必须与 spec 一致，发现歧义先澄清 spec 再改代码。
- **运行形态**：
    - 本地：通过 CLI / `python -m brake_calc` 跑调试
    - 云端：Hermes 直接 `import brake_calc.workflow.runner` 调用

## 2. 目录结构（只读约定）

```
src/brake_calc/
  contracts/   # pydantic 数据契约（Inputs / Context / Report），对应 spec §4、§5
  modules/     # s1..s9 工作流模块，一个文件一个模块，入口函数固定 run(ctx) -> ctx
  domain/      # 纯计算函数（运动学、质量模型、分配、机械模型、k(f) 校准、报告派生量）
  workflow/    # runner + workflow.yaml（执行顺序，对应 spec §8）
  io/          # 配置加载、YAML/Markdown 报表输出
  cli.py       # 本地命令行入口
configs/       # 示例输入、pressure_calibration 标定配置、项目配置
tests/         # unit + integration + fixtures
specs/         # 业务 spec（唯一真相源）
```

**Agent 不得擅自**：新增顶层目录、把 `domain/` 里的纯函数依赖改成有副作用、绕过 `contracts/` 直接用 dict 传 context。

## 3. 技术栈与依赖

- Python: **3.11+**（`.python-version` 固定）
- 包管理：**uv**（`uv sync` 安装，`uv run` 执行）
- 数据契约：**pydantic v2**
- 数值计算：**numpy**（仅在 `domain/` 用；`contracts/` 保持纯 pydantic）
- 单位处理：字段注释里写明单位，统一在 `validate_inputs` 归一化（不引入 `pint` 以保持轻量）
- 配置文件：**YAML**（`ruamel.yaml` 或 `pyyaml`）
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
- 抛异常用 `brake_calc.errors` 里的自定义类型；非致命问题写入 `ctx.warnings`

### 5.2 命名与单位

- 字段名与 spec §5.2 清单**严格一致**（`Beta_list`、`F_by_controller`、`BCP_calibrated_by_controller` 等）
- 所有数值字段在 pydantic 模型里用 `Field(..., description="单位: kN")` 注明单位
- 能用枚举就不用字符串：`CarType = Literal["powered", "trailer"]`、`AllocationStrategy = Literal["equal_wear", "equal_adhesion"]`

### 5.3 风格

- 类型注解必填，mypy strict 通过
- 函数 docstring 用中文；代码标识符、commit message 用英文
- 行宽 100，ruff 默认规则 + `I`（import 排序）+ `N`（命名）

## 6. 测试约定

- **单测**：每个 module 一个 `test_sN_*.py`，覆盖正常路径 + spec 中明确的边界规则（EB/FB 强制等黏着、AW2 fallback、clamp 触发等）
- **集成测试**：`tests/integration/test_workflow_end_to_end.py` 覆盖端到端 workflow
- **契约测试**：pydantic 模型的 schema 快照进 `tests/fixtures/schemas/`，改契约时 snapshot diff 必须人工确认
- 新增/修改功能前先写/改测试；PR 里测试先行

## 7. Agent 工作流（给 Codex / Claude 看）

做任何代码改动前，**按此顺序**：

1. **读 spec**：`specs/Brake_Calc_ Workflow_Spec_v1.0.md` 对应章节（不是 Notion 链接；本地文件是权威副本）
2. **读契约**：`src/brake_calc/contracts/` 相关字段
3. **读相邻模块**：上下游 `run()` 的输入输出，确认字段名/形状一致
4. **改代码**
5. **跑检查**：`ruff + mypy + pytest`（见 §4）
6. **不允许跳过测试直接提交**

### 禁止事项

- ❌ 不得修改 `specs/` 下的文件（spec 由人类维护；如发现 spec 有歧义或错误，在 PR 描述里说明，让人类更新）
- ❌ 不得在 `modules/` 里硬编码单位换算或常数；放到 `domain/` 或 `configs/`
- ❌ 不得绕过 `Context`，用全局变量/模块级状态在模块间传数据
- ❌ 不得用 `print` 做日志；统一 `logging`，模块内 `logger = logging.getLogger(__name__)`
- ❌ 不得把 Mathcad 范例的数值硬写进实现里当做"正确答案"；它只在测试 fixture 里出现

### 任务分解建议

长任务（比如"从零实现 s1..s9"）分步：

1. 先完成 `contracts/inputs.py` + `contracts/context.py`，跑通 schema 快照测试
2. 再按 s1 → s9 逐个实现模块 + 单测，每步独立提交
3. 最后跑集成测试对齐 Mathcad 范例

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

- 入口：`brake_calc.workflow.runner.run_workflow(inputs: Inputs) -> Report`
- 不依赖本地文件系统；配置由调用方构造 `Inputs` 对象传入
- `trace` 字段由 runner 写入；Hermes 侧可选择落盘或只返回摘要
- Markdown 报告由本地 CLI / I/O 层按需导出；Hermes 默认返回结构化 `Report`，不依赖文件落盘。
- 日志用结构化 JSON（`logging.Formatter` 输出 JSON 行），方便云端采集

## 10. 需要人类确认的场景

以下情况 agent **必须停下来问人**，不要擅自决定：

- spec 里某规则表述与现有实现冲突
- 新增 brake_type 类型（除 spec 已列出的 FSB/EB/FB/ratio_of_FSB）
- 修改 Context 字段命名或形状
- 引入新的三方依赖
- 改动 `workflow.yaml` 的执行顺序

---

> 本文件是仓库层面的 agent 规则；业务逻辑请查阅 `specs/Brake_Calc_ Workflow_Spec_v1.0.md`。
> 

> 两份文档有冲突时，**spec 为准**，并在 PR 里提出更新本文件。
>