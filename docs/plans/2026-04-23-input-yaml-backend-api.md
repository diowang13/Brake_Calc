# input.yaml 后端 API 与 Hermes Tool 实施计划

> **给执行 agent 的要求：** 按本计划逐项执行时，必须使用 `superpowers:executing-plans` 技能。

**目标：** 为 Web UI 提供后端 API，并提供 Hermes 可调用的 skill/tool 边界，使其能够校验已保存 YAML、运行 brake-calc、持久化结果，并在后续发送报告邮件。

**架构：** 后端封装现有 brake-calc contracts 和 workflow，不重复实现计算逻辑。Web endpoint 负责 UI 流程，例如 validate/save/import/export；Hermes-facing 函数通过 `project_code` 或 `input_config_id` 定位配置，并用校验后的 `Inputs` 调用 `brake_calc.workflow.runner.run_workflow`。

**技术栈：** Python 后端，复用现有 `brake_calc` package。若批准新增依赖，推荐 FastAPI 作为 Web API 框架；否则 MVP 可先只做 service 函数或最小 HTTP 原型。YAML 解析尽量复用现有 `brake_calc.io.config`。

---

## 范围

包含：
- 使用现有 `Inputs`/S1 逻辑的后端校验服务。
- YAML 序列化/解析服务。
- Web UI API：validate、save、load、import、export。
- Hermes-facing 计算函数。
- calculation run 持久化挂钩。
- 邮件发送接口设计。

不包含：
- 前端实现。
- SQLite schema 具体实现。
- MVP 阶段真实邮件 provider 集成。
- 认证和权限。
- 生产部署基础设施。

## 设计原则

- 复用现有代码路径：
  - `src/brake_calc/contracts/inputs.py`
  - `src/brake_calc/modules/s1_validate_inputs.py`
  - `src/brake_calc/workflow/runner.py`
  - `src/brake_calc/io/config.py`
  - `src/brake_calc/io/report.py`
- 以 S1/`Inputs.model_validate` 作为权威校验。
- Web 元数据与 `Inputs` 分离。
- 后端必须同时支持：
  - 直接 YAML 文本
  - 已保存的 `input_config_id`
- Hermes 不应依赖浏览器端状态。
- 计算函数必须可 import 并直接调用，不依赖 Web server。

---

## 后端 package 布局

建议文件：

```text
src/brake_calc/app/
  __init__.py
  schemas.py
  services.py
  api.py
  hermes_tools.py
  email.py
```

职责：

- `schemas.py`
  - API 边界的 request/response pydantic 模型。

- `services.py`
  - 校验服务。
  - YAML 导入/导出服务。
  - 配置保存/读取编排。
  - 计算编排。

- `api.py`
  - 如果批准 FastAPI 或类似框架，这里放 HTTP routes。

- `hermes_tools.py`
  - 准备注册为 Hermes skill/tool 的可 import 函数。

- `email.py`
  - 邮件发送接口和 no-op/dev 实现。

不要把 Web route 逻辑写进 workflow modules。

---

## API 数据契约

### 共享项目元数据

```json
{
  "project_name": "示例项目",
  "project_code": "TKQ001",
  "email": "user@example.com",
  "note": "optional"
}
```

### 校验错误格式

```json
{
  "path": "mass_params.powered_bogie.mass_static.AW0",
  "message": "mass_static values must be > 0",
  "severity": "error"
}
```

说明：
- 将 pydantic 的 location tuple 转成 dot path。
- 保留原始后端错误信息，便于追溯。
- 前端尽可能把 dot path 映射到具体字段。

---

## Web API Endpoints

### `POST /api/configs/validate`

用途：保存/导出前校验生成的 YAML 或 Inputs JSON。

请求方式一：

```json
{
  "yaml_text": "v0: 80.0\n..."
}
```

请求方式二：

```json
{
  "inputs": {
    "v0": 80.0
  }
}
```

响应：

```json
{
  "valid": true,
  "errors": [],
  "normalized_inputs": {}
}
```

行为：
- 如果提供 `yaml_text`，先解析 YAML。
- 通过 `Inputs.model_validate` 和/或 S1 校验。
- 校验通过时返回 normalized inputs。

### `POST /api/configs`

用途：保存项目元数据和生成的配置版本。

请求：

```json
{
  "project": {
    "project_name": "示例项目",
    "project_code": "TKQ001",
    "email": "user@example.com",
    "note": ""
  },
  "yaml_text": "v0: 80.0\n...",
  "form_state": {},
  "validate_before_save": true
}
```

响应：

```json
{
  "project_id": "uuid",
  "input_config_id": "uuid",
  "version": 1,
  "validation_status": "valid",
  "errors": []
}
```

行为：
- 按 `project_code` upsert 或创建项目。
- 校验 YAML。
- 插入不可变配置版本。

### `GET /api/projects`

用途：搜索项目元数据。

查询参数：
- `q`
- `project_code`
- `email`

响应：

```json
{
  "items": [
    {
      "id": "uuid",
      "project_name": "示例项目",
      "project_code": "TKQ001",
      "email": "user@example.com",
      "updated_at": "..."
    }
  ]
}
```

### `GET /api/projects/{project_id}/configs`

用途：列出某项目保存的配置版本。

响应：

```json
{
  "items": [
    {
      "id": "uuid",
      "version": 1,
      "validation_status": "valid",
      "created_at": "...",
      "exported_filename": "TKQ001_input_20260423_1530.yaml"
    }
  ]
}
```

### `GET /api/configs/{input_config_id}`

用途：读取一个已保存配置，用于重新编辑。

响应：

```json
{
  "project": {},
  "yaml_text": "v0: 80.0\n...",
  "form_state": {},
  "validation_status": "valid",
  "errors": []
}
```

### `POST /api/configs/import-yaml`

用途：导入已有 YAML，并转换为 UI 状态。

请求：

```json
{
  "yaml_text": "v0: 80.0\n..."
}
```

响应：

```json
{
  "valid": true,
  "errors": [],
  "inputs": {},
  "form_state": {}
}
```

行为：
- 解析 YAML。
- 校验。
- 尽可能派生 FormState。
- YAML 中没有项目元数据时，项目字段留空。

### `GET /api/configs/{input_config_id}/download`

用途：用确定性文件名下载 YAML。

响应：
- Content-Type: YAML/text。
- Content-Disposition 文件名：

```text
{project_code}_input_{YYYYMMDD_HHmm}.yaml
```

### `POST /api/configs/{input_config_id}/run`

用途：使用已保存配置运行制动计算。

响应：

```json
{
  "calculation_run_id": "uuid",
  "status": "succeeded",
  "report": {},
  "warnings": []
}
```

MVP 可以同步执行。云端部署后可以改成排队/异步执行。

### `POST /api/runs/{calculation_run_id}/send-email`

用途：将报告发送到项目邮箱。

MVP 行为：
- 可以使用 no-op/dev 邮件发送器。
- 应创建 `email_deliveries` 记录。

---

## Hermes Tool 边界

Hermes 最好调用可 import 的 Python 函数，而不是必须走 HTTP；除非部署方式要求 HTTP。

建议在 `src/brake_calc/app/hermes_tools.py` 中提供：

```python
def validate_saved_config(input_config_id: str) -> dict[str, object]:
    """校验已保存输入配置并返回校验结果。"""

def run_saved_config(input_config_id: str) -> dict[str, object]:
    """使用已保存输入配置运行 brake-calc，并持久化运行结果。"""

def run_latest_project_config(project_code: str) -> dict[str, object]:
    """运行某项目最新有效配置。"""

def send_latest_report(project_code: str) -> dict[str, object]:
    """将某项目最新成功报告发送到已保存邮箱。"""
```

工具行为：
- 从 storage 加载 YAML。
- 通过 `Inputs` 校验。
- 调用 `run_workflow(inputs)`。
- 持久化 `calculation_runs`。
- 可选：通过现有 report 输出工具生成 Markdown。
- 返回适合 Hermes 使用的紧凑、可 JSON 序列化摘要。

Hermes 输入优先级：
- 需要精确复现时，用 `input_config_id`。
- 用户只说项目时，用 `project_code` 获取最新配置。

---

## Service 层

### `ValidationService`

职责：
- 解析 YAML 文本。
- 用 `Inputs` 校验数据。
- 可选运行 S1。
- 返回规范化错误。

重要说明：
- 如果 S1 本身封装了 `Inputs.model_validate`，优先用 S1 保持一致。
- 如果 S1 需要 Context 对象，则暴露一个更轻的 validation 函数，但必须复用同一校验路径，不重复造规则。

### `ConfigService`

职责：
- 保存项目元数据和配置版本。
- 读取配置版本。
- 导入 YAML 并转成规范化输入。
- 生成导出文件名。

### `CalculationService`

职责：
- 加载已保存配置。
- 运行前校验。
- 将校验后的输入转成 `Inputs`。
- 调用 `brake_calc.workflow.runner.run_workflow`。
- 将成功或失败结果保存到 `calculation_runs`。

### `EmailService`

职责：
- 检查项目邮箱是否存在。
- 查找报告 artifact 或 report JSON。
- 后续通过配置的 provider 发送邮件。
- MVP 可以实现 no-op sender，记录为 `skipped` 或 dev 成功。

---

## 实施任务

### 任务 1：确认 Web 框架和依赖策略

**文件：**
- 读取：`pyproject.toml`
- 读取：`AGENTS.md`
- 暂不改代码

**步骤 1：决定框架**

选项：
- FastAPI：推荐用于真实云端 API。
- Flask：可用，但类型边界弱一些。
- 暂不做 HTTP server，只做 service 函数。

**步骤 2：如果新增依赖，走确认流程**

`AGENTS.md` 规定新增第三方依赖需要人工确认。

预期：新增 Web 依赖前必须得到明确批准。

### 任务 2：添加 backend app package 骨架

**文件：**
- 创建：`src/brake_calc/app/__init__.py`
- 创建：`src/brake_calc/app/schemas.py`
- 创建：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_validation_service.py`

**步骤 1：写失败的 validation service 测试**

使用 `configs/example_input.yaml` 文本，期望校验通过。

**步骤 2：实现最小 `ValidationService`**

解析 YAML，并用 `Inputs.model_validate` 校验。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/app/test_validation_service.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(app): add input validation service"
```

### 任务 3：规范化校验错误

**文件：**
- 修改：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_validation_service.py`

**步骤 1：添加非法 YAML 测试**

覆盖：
- 缺少 EB
- 质量非法
- controller type 非法

**步骤 2：实现错误规范化**

返回 dot path 和 message。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/app/test_validation_service.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(app): normalize input validation errors"
```

### 任务 4：添加 Config Service

**文件：**
- 修改：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_config_service.py`

**步骤 1：用 fake repositories 写测试**

覆盖：
- 保存有效配置
- 保存无效配置并记录校验错误
- 生成导出文件名

**步骤 2：实现 `ConfigService`**

协调 validation 和 storage repositories。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/app/test_config_service.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(app): save and load input configs"
```

### 任务 5：添加 YAML 导入转换服务

**文件：**
- 修改：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_yaml_import_service.py`

**步骤 1：写导入测试**

使用 `configs/example_input.yaml`，验证：
- 结果有效
- 项目元数据为空
- FormState 包含 example config 的 6 个 bogie
- bogie 名称保留 `trailer_bogie_1` 风格

**步骤 2：实现 FormState 反向转换**

将后端 Inputs 尽可能转换成 UI FormState。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/app/test_yaml_import_service.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(app): import yaml into ui form state"
```

### 任务 6：添加 Calculation Service

**文件：**
- 修改：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_calculation_service.py`

**步骤 1：用 example input 写测试**

可以 mock 或使用临时 storage repository。

**步骤 2：实现已保存配置运行**

加载 YAML、校验、调用 `run_workflow`。

**步骤 3：持久化运行状态**

保存成功和失败状态。

**步骤 4：运行测试**

```bash
uv run pytest tests/unit/app/test_calculation_service.py -v
```

**步骤 5：提交**

```bash
git commit -m "feat(app): run saved brake calculation configs"
```

### 任务 7：添加 Hermes Tool 函数

**文件：**
- 创建：`src/brake_calc/app/hermes_tools.py`
- 测试：`tests/unit/app/test_hermes_tools.py`

**步骤 1：用 fake services 写测试**

覆盖：
- 校验已保存配置
- 按 `input_config_id` 运行
- 按 `project_code` 运行最新配置
- 发送报告时缺少邮箱

**步骤 2：实现 tool wrappers**

每个函数保持小而明确，返回 JSON-serializable dict。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/app/test_hermes_tools.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(app): expose hermes calculation tools"
```

### 任务 8：添加 HTTP API Routes

**文件：**
- 创建/修改：`src/brake_calc/app/api.py`
- 测试：`tests/unit/app/test_api.py`

**步骤 1：写 API 测试**

使用所选框架的 test client。

**步骤 2：实现 validate/save/load/import/download routes**

routes 只调用 service 层。

**步骤 3：实现 run route**

MVP 可同步执行。

**步骤 4：运行测试**

```bash
uv run pytest tests/unit/app/test_api.py -v
```

**步骤 5：提交**

```bash
git commit -m "feat(app): add web api for input configs"
```

### 任务 9：添加 Email Service 接口

**文件：**
- 创建：`src/brake_calc/app/email.py`
- 测试：`tests/unit/app/test_email_service.py`

**步骤 1：写 no-op sender 测试**

覆盖：
- 缺少邮箱
- 创建 pending delivery
- no-op 成功/跳过行为

**步骤 2：实现接口**

定义 email sender protocol 和 no-op 实现。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/app/test_email_service.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(app): add report email service interface"
```

### 任务 10：后端端到端测试

**文件：**
- 测试：`tests/integration/test_app_config_to_report_flow.py`

**步骤 1：写集成测试**

流程：
- 保存项目元数据和 example YAML
- 校验配置
- 运行计算
- 保存报告
- 用 no-op sender 创建 email delivery 记录

**步骤 2：运行集成测试**

```bash
uv run pytest tests/integration/test_app_config_to_report_flow.py -v
```

**步骤 3：运行相关完整检查**

```bash
uv run ruff check src tests
uv run mypy src
uv run pytest
```

**步骤 4：提交**

```bash
git commit -m "test(app): cover config to report backend flow"
```

---

## 验收标准

- 后端通过现有 `Inputs`/S1 逻辑校验生成的 YAML。
- API 可以保存项目元数据和配置 YAML，且不把元数据写入 YAML。
- API 可以读取已保存配置，用于 UI 重新编辑。
- API 可以导入已有 YAML，并返回 UI-compatible FormState。
- API 可以用 `{project_code}_input_{YYYYMMDD_HHmm}.yaml` 导出 YAML。
- Hermes-facing 函数可以按 `input_config_id` 或 `project_code` 最新配置运行。
- calculation run 成功/失败状态能持久化。
- 邮件发送有清晰接口，MVP 有 no-op 行为。
- 测试覆盖校验、保存/读取、导入/导出、Hermes tool 函数、配置到报告流程。

## 实施前待确认

1. 是否批准 FastAPI 作为云端后端新依赖？
2. Hermes 最终调用 Python 函数、HTTP endpoint，还是两者都支持？
3. MVP 计算是同步执行，还是一开始就做 queued job？
4. 云端部署时 Markdown 报告存在哪里：数据库、文件系统卷、对象存储，还是都存？
5. 后续使用哪个邮件 provider？服务器环境是否允许 SMTP？
6. API 返回给 Web UI 的是完整 report JSON，还是摘要 + 下载链接？

## 建议执行顺序

三份计划的整体执行顺序：

1. 先完成前端 UI 计划中的 FormState 定义。
2. 实施 SQLite 持久化计划。
3. 实施后端 service/API 计划。
4. 将前端接入后端 validation/save/import/export。
5. 添加 Hermes tool 注册和部署包装。
