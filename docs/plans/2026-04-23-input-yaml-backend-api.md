# input.yaml 后端 API 与 Hermes Tool 实施计划

> **给执行 agent 的要求：** 按本计划逐项执行时，必须使用 `superpowers:executing-plans` 技能。

**目标：** 在 V1 已冻结输入契约和 report 口径之上，建设可复用的 backend service/API/Hermes 边界，支持校验、保存、导入、导出、运行 brake-calc，并复用 storage 层完成版本化与追溯。

**架构：** backend 先实现 service 层，再选择性暴露 HTTP route。service 层直接复用现有 `Inputs`、`validate_inputs`、`run_workflow` 和 storage repositories；Hermes 优先调用可 import 的 Python 函数，不把 HTTP 作为唯一入口。HTTP 仅作为 Web UI 编排层。

**技术栈：** Python 后端，复用现有 `brake_calc` package。MVP 不强依赖 FastAPI；先完成 `src/brake_calc/app/` 下 service 与 Hermes wrappers，再按需要加 route 层。

---

## 前置依赖

本计划依赖 storage 计划先完成以下能力：

- `ProjectRepository`
- `InputConfigRepository`
- `CalculationRunRepository`
- `EmailDeliveryRepository`
- SQLite schema 已稳定支持 `schema_version`、`yaml_text`、`form_state_json`、`report_json`

本计划不先于 storage 落地。

---

## V1 对齐结论

backend 必须完整支持当前 V1 契约与输出：

- `schema_version`
- `controller_type = bogie | car`
- `FSB`、`EB`、`FB`、`ratio_of_FSB`
- `tread_cylinder`、`caliper_cylinder`
- `pressure_calibration.service_brake / emergency_brake / point_pair_mode / points`
- `parking_brake_check`
- `adhesion`
- `electric_brake`
- 结构化 `report`
- `auto_adjustments`

backend 不得自行发明新的输入字段结构，也不得让 Web UI 与 Hermes 使用不同的输入语义。

---

## 设计原则

- 权威输入校验路径以 `Inputs` / `validate_inputs` 为准。
- `project` 元数据与 `Inputs` 严格分离。
- `yaml_text` 是计算权威输入；`form_state_json` 只是 UI 回填辅助。
- `validate / import / export / run` 的 request/response shape 在本计划中先固定，再让 frontend 消费。
- service 层先稳定，route 层后加。
- Hermes 与 Web UI 共用同一套 service，不实现两套逻辑。

---

## 代码组织

建议使用：

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

- `schemas.py`：API request/response 模型
- `services.py`：validation / config / calculation / import-export orchestration
- `api.py`：可选 HTTP routes
- `hermes_tools.py`：Hermes 入口函数
- `email.py`：no-op / interface

不要在 workflow modules 中嵌入 Web/API 逻辑。

---

## 稳定接口定义

### 1. `POST /api/configs/validate`

用途：校验 YAML 或 Inputs-like JSON。

请求允许两种入口：

```json
{"yaml_text": "..."}
```

或

```json
{"inputs": {...}}
```

响应固定包含：

```json
{
  "valid": true,
  "errors": [],
  "normalized_inputs": {}
}
```

说明：

- `normalized_inputs` 是后端权威规范化结果
- 错误路径使用 dot path，供前端字段定位

### 2. `POST /api/configs`

用途：保存项目元数据和配置版本。

请求：

```json
{
  "project": {
    "project_name": "...",
    "project_code": "...",
    "email": null,
    "note": ""
  },
  "yaml_text": "...",
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

### 3. `GET /api/configs/{input_config_id}`

用途：读取一个已保存配置，供 UI 重新编辑。

响应必须同时返回：

- `project`
- `yaml_text`
- `form_state`
- `validation_status`
- `errors`

### 4. `POST /api/configs/import-yaml`

用途：导入既有 YAML，并回填可编辑 FormState。

请求：

```json
{"yaml_text": "..."}
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

这里必须明确：

- backend 负责从 `Inputs` 尽可能派生 UI-compatible `form_state`
- frontend 不应假设浏览器端自己完整反推 YAML

### 5. `GET /api/configs/{input_config_id}/download`

用途：按稳定文件名导出 YAML。

文件名规则：

```text
{project_code}_input_{YYYYMMDD_HHmm}.yaml
```

### 6. `POST /api/configs/{input_config_id}/run`

用途：运行已保存配置。

响应：

```json
{
  "calculation_run_id": "uuid",
  "status": "succeeded",
  "report": {},
  "warnings": []
}
```

这里 `report` 必须是当前 V1 结构化 report，而不是前端自组装摘要。

### 7. Hermes tools

Hermes 先暴露 Python 函数：

```python
def validate_saved_config(input_config_id: str) -> dict[str, object]: ...
def run_saved_config(input_config_id: str) -> dict[str, object]: ...
def run_latest_project_config(project_code: str) -> dict[str, object]: ...
def send_latest_report(project_code: str) -> dict[str, object]: ...
```

入口优先级：

- `input_config_id`：精确复现
- `project_code`：运行最新有效配置

---

## Service 层职责

### `ValidationService`

负责：

- 解析 `yaml_text`
- 调用权威输入校验
- 规范化错误为 dot path
- 返回 normalized inputs

不要复制一套前端校验规则，不要自行维护第二套契约。

### `ConfigService`

负责：

- 保存项目元数据
- 保存 input config 版本
- 读取已保存配置
- 生成导出文件名

### `YamlImportService`

负责：

- `yaml_text -> Inputs`
- `Inputs -> editable form_state`

这里的重点是“可编辑回填”，不是完全保真还原用户原始前端瞬时状态。

### `CalculationService`

负责：

- 读取 input_config
- 运行前再做权威校验
- 调用 `run_workflow(inputs)`
- 写入 `calculation_runs`
- 保存 `report_json`

### `EmailService`

本阶段只定义接口与 no-op 实现：

- 缺邮箱时返回 `skipped`
- 可为后续 provider 保留注入点
- 不在本阶段接真实 SMTP/provider

---

## 实施任务

### 任务 1：搭建 app package 与 `ValidationService`

**文件：**

- 创建：`src/brake_calc/app/__init__.py`
- 创建：`src/brake_calc/app/schemas.py`
- 创建：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_validation_service.py`

**步骤：**

1. 写失败测试，覆盖 example YAML 校验成功。
2. 写失败测试，覆盖非法 YAML / 非法字段 / 非法枚举。
3. 实现最小 `ValidationService`。
4. 运行 `uv run pytest tests/unit/app/test_validation_service.py -v`。
5. 提交：

```bash
git commit -m "feat(app): add validation service"
```

### 任务 2：实现 `ConfigService`

**文件：**

- 修改：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_config_service.py`

**步骤：**

1. 用 fake repositories 写失败测试。
2. 覆盖 save/load/export filename。
3. 明确保存时必须同时写 `yaml_text` 与 `form_state_json`。
4. 运行 `uv run pytest tests/unit/app/test_config_service.py -v`。
5. 提交：

```bash
git commit -m "feat(app): add config service"
```

### 任务 3：实现 `YamlImportService`

**文件：**

- 修改：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_yaml_import_service.py`

**步骤：**

1. 写失败测试，覆盖 example YAML -> valid + form_state。
2. 重点验证回填这些 V1 字段：
   - `controller_type`
   - `FB`
   - `caliper_cylinder`
   - `parking_brake_check`
   - `adhesion`
   - 试验点驱动标定
3. 运行 `uv run pytest tests/unit/app/test_yaml_import_service.py -v`。
4. 提交：

```bash
git commit -m "feat(app): add yaml import service"
```

### 任务 4：实现 `CalculationService`

**文件：**

- 修改：`src/brake_calc/app/services.py`
- 测试：`tests/unit/app/test_calculation_service.py`

**步骤：**

1. 写失败测试，覆盖运行已保存 config。
2. 确认 `report_json` 透传当前 V1 结构化 report。
3. 确认 `auto_adjustments`、parking brake、calibration summary、electric brake summary 均进入返回值和持久化。
4. 运行 `uv run pytest tests/unit/app/test_calculation_service.py -v`。
5. 提交：

```bash
git commit -m "feat(app): add calculation service"
```

### 任务 5：实现 Hermes wrappers

**文件：**

- 创建：`src/brake_calc/app/hermes_tools.py`
- 测试：`tests/unit/app/test_hermes_tools.py`

**步骤：**

1. 写失败测试，覆盖 `input_config_id` 与 `project_code` 两种入口。
2. 保持函数薄封装，只协调 service。
3. 返回 JSON-serializable dict，不暴露 Python 对象。
4. 运行 `uv run pytest tests/unit/app/test_hermes_tools.py -v`。
5. 提交：

```bash
git commit -m "feat(app): add hermes tool wrappers"
```

### 任务 6：最后再加可选 HTTP routes

**文件：**

- 创建：`src/brake_calc/app/api.py`
- 测试：`tests/unit/app/test_api.py`

**步骤：**

1. 仅在 service 层稳定后实现 route。
2. routes 只做 request/response 映射，不写业务逻辑。
3. 覆盖：
   - validate
   - save config
   - load config
   - import yaml
   - download yaml
   - run config
4. 运行 `uv run pytest tests/unit/app/test_api.py -v`。
5. 提交：

```bash
git commit -m "feat(app): add config api routes"
```

---

## 验收标准

- backend service 可保存、读取、导入、导出、运行 V1 配置。
- `validate/import/export/run` 接口 shape 对前端是稳定的。
- `run` 返回 V1 结构化 report。
- Hermes tool 可按 `input_config_id` 和 `project_code` 运行。
- backend 复用 storage repositories，不绕过 storage 直接写 SQLite。

## 与前端计划的衔接

frontend 计划必须假定：

- backend 已提供 `validate/save/load/import/download/run`
- backend import path 会返回可编辑 `form_state`
- UI 不直接消费数据库，也不自行定义 report shape

frontend 不得先于这些 service contract 自行拍脑袋定义保存与导入协议。
