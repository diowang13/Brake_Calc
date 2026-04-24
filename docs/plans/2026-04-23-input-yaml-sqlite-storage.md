# input.yaml SQLite 持久化实施计划

> **给执行 agent 的要求：** 按本计划逐项执行时，必须使用 `superpowers:executing-plans` 技能。

**目标：** 设计并实现轻量 SQL 持久化，用于保存项目元数据、生成的 input YAML 版本、校验结果，以及未来 Hermes 计算记录和报告邮件发送记录。

**架构：** UI-only 项目元数据与 brake-calc 的 `input.yaml` 契约分开存储。一个项目可以有多个配置版本；每个版本保存确定性的 YAML 文本、规范化 UI FormState JSON、校验状态，以及后续计算/报告相关元数据。

**技术栈：** MVP 使用 SQLite。后端通过一个小型 repository/service 层访问数据库。MVP 阶段 Python 标准库 `sqlite3` 足够；只有在后端计划明确需要更复杂 migration 或 ORM 时，才考虑 SQLAlchemy。

---

## V1 对齐说明

本计划已被 [2026-04-24-v1-contract-and-feature-upgrade.md](/D:/codeX/Brake_Calc_Agent/Brake_Calc/docs/plans/2026-04-24-v1-contract-and-feature-upgrade.md) 补充和约束。V1 冻结后，storage 层至少要额外支持：

- `schema_version`
- `controller_type = bogie | car`
- `fast_brake`
- `parking_brake_check`
- `adhesion`
- `electric_brake`
- 新的试验点驱动标定结构
- `auto_adjustments`
- 更完整的 `report_json`

建议在本计划基础上追加以下结构调整：

- `input_configs` 增加 `schema_version`
- `calculation_runs.report_json` 必须覆盖：
  - 压力标准结果
  - 标定摘要
  - 停放制动力校核
  - 自动调整记录
  - 电制动识别摘要
- 如果要保留电制动原始上传图片/文档，增加附件表，例如 `input_artifacts`

---

## 范围

包含：
- SQLite schema 设计。
- 项目元数据持久化。
- 配置版本持久化。
- 校验结果持久化。
- 导入/导出审计字段。
- 未来 Hermes run/report/email 记录。
- repository/service 职责。
- MVP migration 方式。

不包含：
- 前端 UI 实现。
- 后端 HTTP route 细节。
- 实际制动计算执行。
- 实际邮件发送。
- 多用户认证和权限模型。

## 存储原则

- `input.yaml` 仍然是传给 brake-calc 的计算契约。
- UI 元数据不写入 YAML。
- 同时保存 YAML 文本和 UI FormState JSON：
  - YAML 用于后端/Hermes 可复现计算。
  - FormState 用于重新打开 Web UI 并编辑配置，避免完全从 YAML 反推控件状态。
- 配置版本尽量 append-only，不覆盖历史版本。
- `project_code` 作为人工检索字段；主键仍使用 UUID/string `id`。
- 时间戳统一保存 UTC ISO-8601 文本。
- SQLite 是 MVP 存储，但 schema 不应假设只能本地使用。

---

## 数据库文件建议

开发环境推荐路径：

```text
data/brake_calc.sqlite3
```

待确认：
- `data/` 是新顶层目录，按仓库规则需要批准。
- 另一个做法是后端通过配置指向仓库外部路径。

推荐做法：
- 开发环境使用环境变量 `BRAKE_CALC_DB_PATH`。
- 如果未设置，默认使用 `out/brake_calc.sqlite3`，避免新增顶层目录。
- 云端部署时，将 `BRAKE_CALC_DB_PATH` 指向持久化卷路径。

---

## 数据表

### `projects`

保存可检索项目元数据。

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_code TEXT NOT NULL UNIQUE,
  email TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);
```

索引：

```sql
CREATE INDEX idx_projects_project_name ON projects(project_name);
CREATE INDEX idx_projects_email ON projects(email);
```

说明：
- `project_code` 对应 UI 原型里的 TKQ。
- `email` 本地生成 YAML 时不是必需，但后续云端发送报告需要。
- `archived_at` 支持软删除。

### `input_configs`

保存生成的 YAML 版本。

```sql
CREATE TABLE input_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  display_name TEXT,
  yaml_text TEXT NOT NULL,
  form_state_json TEXT NOT NULL,
  yaml_sha256 TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  validation_errors_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  source TEXT NOT NULL,
  exported_filename TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  UNIQUE(project_id, version)
);
```

`validation_status` 可选值：
- `not_validated`
- `valid`
- `invalid`

`source` 可选值：
- `created_in_ui`
- `imported_yaml`
- `duplicated`

索引：

```sql
CREATE INDEX idx_input_configs_project_id ON input_configs(project_id);
CREATE INDEX idx_input_configs_yaml_sha256 ON input_configs(yaml_sha256);
```

说明：
- 后端 S1 校验错误以 JSON 文本保存。
- `version` 按项目递增。
- `yaml_sha256` 用于去重和复现校验。

### `calculation_runs`

保存未来 Hermes/backend 的计算执行记录。

```sql
CREATE TABLE calculation_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  input_config_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  triggered_by TEXT NOT NULL,
  hermes_session_id TEXT,
  report_json TEXT,
  markdown_report_path TEXT,
  error_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(input_config_id) REFERENCES input_configs(id)
);
```

`status` 可选值：
- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

`triggered_by` 可选值：
- `web_ui`
- `hermes`
- `api`

索引：

```sql
CREATE INDEX idx_calculation_runs_project_id ON calculation_runs(project_id);
CREATE INDEX idx_calculation_runs_input_config_id ON calculation_runs(input_config_id);
CREATE INDEX idx_calculation_runs_status ON calculation_runs(status);
```

说明：
- MVP 可以把结构化报告放到 `report_json`。
- 如果报告落盘，`markdown_report_path` 保存 Markdown 文件路径。

### `email_deliveries`

保存未来报告邮件发送尝试。

```sql
CREATE TABLE email_deliveries (
  id TEXT PRIMARY KEY,
  calculation_run_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_json TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(calculation_run_id) REFERENCES calculation_runs(id)
);
```

`status` 可选值：
- `pending`
- `sent`
- `failed`
- `skipped`

索引：

```sql
CREATE INDEX idx_email_deliveries_run_id ON email_deliveries(calculation_run_id);
CREATE INDEX idx_email_deliveries_status ON email_deliveries(status);
```

---

## 数据流

### 保存新配置

```text
Frontend FormState
  -> 后端序列化，或接收前端传来的 YAML
  -> 后端通过 S1/Inputs 校验
  -> 按 project_code upsert projects
  -> input_configs 插入 version N+1
  -> 返回 project_id + input_config_id + version
```

### 导入已有 YAML

```text
上传 YAML
  -> 后端解析 YAML
  -> 后端通过 S1/Inputs 校验
  -> 后端尽可能派生 FormState
  -> 如果缺少项目元数据，UI 要求用户补填
  -> input_configs 以 source=imported_yaml 插入
```

### Hermes 计算

```text
Hermes 接收 project_code 或 input_config_id
  -> 后端读取 input_configs.yaml_text
  -> 后端校验当前 YAML
  -> 后端运行 brake_calc.workflow.runner
  -> 更新 calculation_runs
  -> 报告/邮件流程读取 projects.email
```

---

## Repository 层

建议后端文件：

```text
src/brake_calc/storage/
  __init__.py
  db.py
  migrations.py
  repositories.py
  models.py
```

职责：

- `db.py`
  - 解析数据库路径。
  - 打开 SQLite connection。
  - 配置 `PRAGMA foreign_keys = ON`。

- `migrations.py`
  - 创建缺失表。
  - 记录 schema version。

- `models.py`
  - 定义项目、配置、run 记录的小型 dataclass 或 typed dict。

- `repositories.py`
  - `ProjectRepository`
  - `InputConfigRepository`
  - `CalculationRunRepository`
  - `EmailDeliveryRepository`

不要让 route handler 直接写 raw SQL。

---

## Migration 策略

MVP 可以使用一个简单的 schema 元数据表：

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

MVP 不一定需要独立 migration 文件。可以用一个 Python 函数按顺序执行 SQL。

第一版 migration 建议命名：

```text
001_initial_storage_schema
```

未来 migration：
- 增加用户账号。
- 增加组织/项目归属。
- 增加 artifact 存储记录。
- 增加云端邮件 provider 元数据。
- 如果并发或部署需要，从 SQLite 迁移到 Postgres。

---

## 实施任务

### 任务 1：确认数据库路径和访问库

**文件：**
- 读取：`AGENTS.md`
- 暂不改代码

**步骤 1：确认 SQLite 路径**

选择：
- 默认 `out/brake_calc.sqlite3`
- 或批准新增 `data/brake_calc.sqlite3`

**步骤 2：确认数据库访问库**

选择：
- MVP 使用标准库 `sqlite3`
- 如果批准 migration/ORM 依赖，则使用 SQLAlchemy

预期：代码改动前要有明确决定。

### 任务 2：添加 storage package 骨架

**文件：**
- 创建：`src/brake_calc/storage/__init__.py`
- 创建：`src/brake_calc/storage/db.py`
- 创建：`src/brake_calc/storage/migrations.py`
- 测试：`tests/unit/storage/test_migrations.py`

**步骤 1：先写失败的 migration 测试**

测试新数据库能初始化，并包含预期表。

**步骤 2：实现 connection helper**

打开 SQLite connection，并启用 foreign keys。

**步骤 3：实现初始 migration**

创建 `projects`、`input_configs`、`calculation_runs`、`email_deliveries`、`schema_migrations`。

**步骤 4：运行测试**

```bash
uv run pytest tests/unit/storage/test_migrations.py -v
```

**步骤 5：提交**

```bash
git commit -m "feat(storage): add sqlite schema migrations"
```

### 任务 3：实现 Project Repository

**文件：**
- 修改：`src/brake_calc/storage/repositories.py`
- 测试：`tests/unit/storage/test_project_repository.py`

**步骤 1：写 repository 测试**

覆盖：
- 创建项目
- 按 id 获取
- 按 project_code 获取
- 更新元数据
- 软归档

**步骤 2：实现 repository 方法**

只使用参数化 SQL。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/storage/test_project_repository.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(storage): persist project metadata"
```

### 任务 4：实现 Input Config Repository

**文件：**
- 修改：`src/brake_calc/storage/repositories.py`
- 测试：`tests/unit/storage/test_input_config_repository.py`

**步骤 1：写 repository 测试**

覆盖：
- 插入第一个版本
- 插入下一个版本
- 列出某项目配置
- 获取最新配置
- 按 id 获取
- 保存 validation errors JSON

**步骤 2：实现 YAML hash helper**

对 UTF-8 YAML 文本计算 SHA-256。

**步骤 3：实现版本递增**

版本号 = 当前项目最大 version + 1。

**步骤 4：运行测试**

```bash
uv run pytest tests/unit/storage/test_input_config_repository.py -v
```

**步骤 5：提交**

```bash
git commit -m "feat(storage): persist input yaml versions"
```

### 任务 5：实现 Calculation Run Repository

**文件：**
- 修改：`src/brake_calc/storage/repositories.py`
- 测试：`tests/unit/storage/test_calculation_run_repository.py`

**步骤 1：写 repository 测试**

覆盖：
- 创建 queued run
- 标记 running
- 标记 succeeded 并保存 report JSON
- 标记 failed 并保存 error JSON

**步骤 2：实现方法**

方法保持小而明确。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/storage/test_calculation_run_repository.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(storage): track calculation runs"
```

### 任务 6：实现 Email Delivery Repository

**文件：**
- 修改：`src/brake_calc/storage/repositories.py`
- 测试：`tests/unit/storage/test_email_delivery_repository.py`

**步骤 1：写 repository 测试**

覆盖：
- 创建 pending delivery
- 标记 sent
- 标记 failed
- 列出某 run 的 delivery

**步骤 2：实现方法**

保存 provider response id 和错误信息，字段可为空。

**步骤 3：运行测试**

```bash
uv run pytest tests/unit/storage/test_email_delivery_repository.py -v
```

**步骤 4：提交**

```bash
git commit -m "feat(storage): track report email delivery"
```

### 任务 7：添加 storage 集成测试

**文件：**
- 测试：`tests/integration/test_storage_config_lifecycle.py`

**步骤 1：写 lifecycle 测试**

流程：
- 创建项目
- 插入配置版本 1
- 插入配置版本 2
- 读取最新配置
- 创建 calculation run
- 创建 email delivery

**步骤 2：运行集成测试**

```bash
uv run pytest tests/integration/test_storage_config_lifecycle.py -v
```

**步骤 3：提交**

```bash
git commit -m "test(storage): cover config lifecycle"
```

---

## 验收标准

- 空数据库可以初始化出 SQLite schema。
- 项目元数据可以保存项目名称、项目代号/TKQ、邮箱、备注、时间戳。
- 每个项目支持多个不可变配置版本。
- YAML 文本和 FormState JSON 一起保存。
- 校验状态和错误可以保存和读取。
- 未来 Hermes calculation run 可以按 config id 跟踪。
- 未来邮件发送尝试可以按 run id 跟踪。
- 测试使用临时数据库文件，不写入开发者真实数据库。

## 实施前待确认

1. MVP 默认数据库路径用 `out/brake_calc.sqlite3`，还是批准新增 `data/` 目录？
2. 使用 Python 标准库 `sqlite3`，还是引入 SQLAlchemy？
3. `project_code` 是否全局唯一？未来多用户情况下是否允许不同用户使用同一个 TKQ？
4. 邮箱是在计算/发送报告前必填，还是用户启用邮件发送时才必填？
5. 生成的报告存 DB 文本、文件系统 artifact，还是两者都存？

## 下一份计划

持久化计划确认后，继续看：

```text
docs/plans/2026-04-23-input-yaml-backend-api.md
```

该计划定义 Web API、Hermes tool 边界、校验、YAML 导入导出、计算执行和报告邮件流程。
