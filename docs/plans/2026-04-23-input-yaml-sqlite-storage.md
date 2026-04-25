# input.yaml SQLite 持久化实施计划

> **给执行 agent 的要求：** 按本计划逐项执行时，必须使用 `superpowers:executing-plans` 技能。

**目标：** 先落稳 brake-calc V1 Web/Hermes 的持久化基础层，明确“项目元数据 / 输入契约 / 结构化报告 / 运行记录”的边界，供 backend service/API 与后续前端稳定复用。

**架构：** storage 层先于 HTTP 与前端交互落地。SQLite 只负责保存项目、输入配置版本、校验结果、计算运行和邮件发送记录；它不承担业务推导，也不改写 `input.yaml` 契约。每个已保存配置必须同时保留可复现的 `yaml_text` 与可回填 UI 的 `form_state_json`。

**技术栈：** MVP 使用 Python 标准库 `sqlite3`。通过 `src/brake_calc/storage/` 下的小型 repository 层访问 SQLite，不引入 ORM，不在本阶段增加真实 migration 框架。

---

## V1 对齐结论

本计划以当前已冻结实现为准，必须覆盖：

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

本计划不实现前端，不实现 Web route，不实现真实邮件 provider。

---

## 存储边界

### 1. `projects`

只保存 UI / 检索元数据，不写入 `input.yaml`：

- `project_name`
- `project_code`
- `email`
- `note`
- 时间戳与归档状态

约束：

- `project_code` 在 MVP 中全局唯一
- `email` 可空
- `project_code` 用于人工检索与默认导出文件名前缀

### 2. `input_configs`

每个配置版本必须 append-only，至少保存：

- `project_id`
- `version`
- `schema_version`
- `yaml_text`
- `form_state_json`
- `yaml_sha256`
- `validation_status`
- `validation_errors_json`
- `source`
- `created_at`

约束：

- 不覆盖历史版本
- `yaml_text` 是 brake-calc 计算真相源
- `form_state_json` 只用于前端回填，不作为计算权威输入
- `validation_status` 仅保存后端权威校验结果

### 3. `calculation_runs`

每次计算执行必须独立记录，至少保存：

- `project_id`
- `input_config_id`
- `status`
- `started_at`
- `finished_at`
- `triggered_by`
- `report_json`
- `markdown_report_path`（可空）
- `error_json`
- `created_at`

其中 `report_json` 必须覆盖当前 V1 已验收输出：

- pressure standards / controller pressure standards
- calibration summary
- parking brake check
- parking brake results by load group
- auto adjustments
- electric brake summary
- warnings / clamp events / trace

### 4. `email_deliveries`

只保存发送尝试，不实现真实 provider：

- `calculation_run_id`
- `recipient_email`
- `status`
- `provider_message_id`
- `error_json`
- `sent_at`
- `created_at`

### 5. 可选保留位：`input_artifacts`

本阶段不落地，但计划中明确保留给后续 electric brake 原始图片/文档上传：

- `input_config_id`
- `artifact_type`
- `mime_type`
- `storage_uri`
- `metadata_json`

不要在第一版 schema 中强行加入，除非 backend 计划同步决定电制动识别上传要进入 MVP。

---

## 数据模型建议

### 推荐数据库路径

- 开发默认：`out/brake_calc.sqlite3`
- 运行时通过 `BRAKE_CALC_DB_PATH` 覆盖

理由：

- 不新增顶层 `data/`
- 符合当前仓库约束
- 与现有 CLI / report 输出路径习惯一致

### 建议表结构

保留并正式确认以下核心表：

- `projects`
- `input_configs`
- `calculation_runs`
- `email_deliveries`
- `schema_migrations`

不再讨论 YAML-only 存储，也不把 report 拆成多张子表。V1 阶段优先保证：

- 输入版本可复现
- report 全量可追溯
- 前端可回填
- Hermes 可按 `input_config_id` 精确运行

### `input_configs` 字段口径

`input_configs` 至少包含：

- `id TEXT PRIMARY KEY`
- `project_id TEXT NOT NULL`
- `version INTEGER NOT NULL`
- `schema_version INTEGER NOT NULL`
- `yaml_text TEXT NOT NULL`
- `form_state_json TEXT NOT NULL`
- `yaml_sha256 TEXT NOT NULL`
- `validation_status TEXT NOT NULL`
- `validation_errors_json TEXT NOT NULL`
- `source TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `exported_filename TEXT`

### `calculation_runs` 字段口径

`calculation_runs` 至少包含：

- `id TEXT PRIMARY KEY`
- `project_id TEXT NOT NULL`
- `input_config_id TEXT NOT NULL`
- `status TEXT NOT NULL`
- `started_at TEXT`
- `finished_at TEXT`
- `triggered_by TEXT NOT NULL`
- `hermes_session_id TEXT`
- `report_json TEXT`
- `markdown_report_path TEXT`
- `error_json TEXT`
- `created_at TEXT NOT NULL`

### 状态枚举

`input_configs.validation_status`：

- `not_validated`
- `valid`
- `invalid`

`calculation_runs.status`：

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

`email_deliveries.status`：

- `pending`
- `sent`
- `failed`
- `skipped`

---

## 数据流

### 保存配置

```text
UI FormState / YAML
  -> backend normalize + validate
  -> upsert project by project_code
  -> write immutable input_config(version N+1)
  -> return project_id + input_config_id + version
```

### 导入 YAML

```text
uploaded yaml_text
  -> backend validate against Inputs
  -> backend derive editable form_state_json
  -> store source=imported_yaml
```

### 运行计算

```text
input_config_id / project_code
  -> load yaml_text from input_configs
  -> validate
  -> run_workflow(inputs)
  -> persist calculation_runs.report_json
```

这里必须明确：storage 层不负责从 YAML 直接推 UI 规则，它只保存 `form_state_json`；真正的导入回填逻辑由 backend service 负责。

---

## 代码组织

建议使用：

```text
src/brake_calc/storage/
  __init__.py
  db.py
  migrations.py
  models.py
  repositories.py
```

职责：

- `db.py`：连接与 PRAGMA
- `migrations.py`：按顺序初始化 schema
- `models.py`：typed dict / dataclass
- `repositories.py`：参数化 SQL 封装

不要让 API route 或 Hermes tool 直接写 SQL。

---

## 实施任务

### 任务 1：初始化 storage 骨架与 schema migration

**文件：**

- 创建：`src/brake_calc/storage/__init__.py`
- 创建：`src/brake_calc/storage/db.py`
- 创建：`src/brake_calc/storage/migrations.py`
- 测试：`tests/unit/storage/test_migrations.py`

**步骤：**

1. 写失败测试，验证空 SQLite 文件可初始化 schema。
2. 实现连接 helper，启用 `PRAGMA foreign_keys = ON`。
3. 实现 `001_initial_storage_schema`，创建 5 张核心表。
4. 运行 `uv run pytest tests/unit/storage/test_migrations.py -v`。
5. 提交：

```bash
git commit -m "feat(storage): add sqlite schema migrations"
```

### 任务 2：实现 `ProjectRepository`

**文件：**

- 创建/修改：`src/brake_calc/storage/repositories.py`
- 测试：`tests/unit/storage/test_project_repository.py`

**步骤：**

1. 写失败测试，覆盖 create/get/by_project_code/update/archive。
2. 用参数化 SQL 实现最小 repository。
3. 运行 `uv run pytest tests/unit/storage/test_project_repository.py -v`。
4. 提交：

```bash
git commit -m "feat(storage): persist project metadata"
```

### 任务 3：实现 `InputConfigRepository`

**文件：**

- 修改：`src/brake_calc/storage/repositories.py`
- 测试：`tests/unit/storage/test_input_config_repository.py`

**步骤：**

1. 写失败测试，覆盖版本递增、读取最新配置、保存 validation。
2. 增加 `yaml_sha256` helper。
3. 确认 `schema_version`、`yaml_text`、`form_state_json` 均为必存字段。
4. 运行 `uv run pytest tests/unit/storage/test_input_config_repository.py -v`。
5. 提交：

```bash
git commit -m "feat(storage): persist input config versions"
```

### 任务 4：实现 `CalculationRunRepository`

**文件：**

- 修改：`src/brake_calc/storage/repositories.py`
- 测试：`tests/unit/storage/test_calculation_run_repository.py`

**步骤：**

1. 写失败测试，覆盖 queued/running/succeeded/failed。
2. 确认 `report_json` 保存 V1 report 全量结构。
3. 确认 `markdown_report_path` 为可空附加字段。
4. 运行 `uv run pytest tests/unit/storage/test_calculation_run_repository.py -v`。
5. 提交：

```bash
git commit -m "feat(storage): track calculation runs"
```

### 任务 5：实现 `EmailDeliveryRepository`

**文件：**

- 修改：`src/brake_calc/storage/repositories.py`
- 测试：`tests/unit/storage/test_email_delivery_repository.py`

**步骤：**

1. 写失败测试，覆盖 pending/sent/failed/skipped。
2. 实现最小 repository。
3. 运行 `uv run pytest tests/unit/storage/test_email_delivery_repository.py -v`。
4. 提交：

```bash
git commit -m "feat(storage): track email deliveries"
```

### 任务 6：storage 生命周期集成测试

**文件：**

- 测试：`tests/integration/test_storage_config_lifecycle.py`

**步骤：**

1. 写 lifecycle 测试：project -> input_config -> calculation_run -> email_delivery。
2. 用临时 SQLite 文件验证全链路。
3. 运行 `uv run pytest tests/integration/test_storage_config_lifecycle.py -v`。
4. 提交：

```bash
git commit -m "test(storage): cover config lifecycle"
```

---

## 验收标准

- 空数据库可初始化 schema。
- `projects`、`input_configs`、`calculation_runs`、`email_deliveries` 均有可测 repository。
- `input_configs` 同时保存 `schema_version`、`yaml_text`、`form_state_json`、validation。
- `calculation_runs.report_json` 可落当前 V1 结构化 report。
- 整套测试使用临时库，不污染开发者本地正式路径。

## 与后续计划的衔接

本计划完成后，backend API 计划必须直接复用：

- `ProjectRepository`
- `InputConfigRepository`
- `CalculationRunRepository`
- `EmailDeliveryRepository`

backend 不得重新定义存储 shape，也不得绕过 repository 直接写 SQLite。

frontend 计划不得假设浏览器端自行持久化历史配置；正式保存与导入都通过 backend + storage。
