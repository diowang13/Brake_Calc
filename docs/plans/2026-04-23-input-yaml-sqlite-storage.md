# Input YAML SQLite Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Design and implement lightweight SQL persistence for project metadata, generated input YAML versions, validation results, and future Hermes calculation/report delivery records.

**Architecture:** Store UI-only project metadata separately from the brake-calc `input.yaml` contract. Each project can have multiple configuration versions; each version stores deterministic YAML text, normalized UI FormState JSON, validation status, and later calculation/report metadata.

**Tech Stack:** SQLite for MVP persistence, accessed through a small backend repository/service layer. Python standard `sqlite3` is sufficient for MVP; introduce SQLAlchemy only if the backend plan explicitly needs richer migrations or ORM behavior.

---

## Scope

In scope:
- SQLite schema design.
- Project metadata persistence.
- Config version persistence.
- Validation result persistence.
- Import/export audit fields.
- Future Hermes run/report/email records.
- Repository/service responsibilities.
- Migration approach for MVP.

Out of scope:
- Frontend UI implementation.
- Backend HTTP route implementation details.
- Actual brake calculation execution.
- Actual email sending.
- Multi-user authentication and permission model.

## Storage Principles

- `input.yaml` remains the contract passed to brake-calc.
- UI metadata stays outside YAML.
- Store both YAML text and UI FormState JSON:
  - YAML supports reproducible backend/Hermes execution.
  - FormState supports reopening the web UI without reverse-engineering every control from YAML.
- Keep all records append-friendly. Do not overwrite historical config versions.
- Use `project_code` as a human lookup key, but keep numeric UUID/string `id` values as primary keys.
- Store timestamps in UTC ISO-8601 text.
- SQLite is the MVP store; schema should not assume local-only deployment.

---

## Proposed Database File

Recommended development path:

```text
data/brake_calc.sqlite3
```

Open decision:
- `data/` is a new top-level directory and requires approval under repository rules.
- Alternative: backend config points to an external path outside the repo in deployment.

Recommended approach:
- In development, use an environment variable `BRAKE_CALC_DB_PATH`.
- If unset, default to `out/brake_calc.sqlite3` to avoid adding a new top-level directory.
- In cloud deployment, set `BRAKE_CALC_DB_PATH` to a persistent volume path.

---

## Tables

### `projects`

Stores searchable project metadata.

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

Indexes:

```sql
CREATE INDEX idx_projects_project_name ON projects(project_name);
CREATE INDEX idx_projects_email ON projects(email);
```

Notes:
- `project_code` corresponds to TKQ in the prototype.
- `email` is not required for local YAML generation, but needed for future cloud report delivery.
- `archived_at` supports soft delete.

### `input_configs`

Stores generated YAML versions.

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

Allowed `validation_status` values:
- `not_validated`
- `valid`
- `invalid`

Allowed `source` values:
- `created_in_ui`
- `imported_yaml`
- `duplicated`

Indexes:

```sql
CREATE INDEX idx_input_configs_project_id ON input_configs(project_id);
CREATE INDEX idx_input_configs_yaml_sha256 ON input_configs(yaml_sha256);
```

Notes:
- Store backend S1 validation errors as JSON text.
- `version` increments per project.
- `yaml_sha256` supports deduplication and reproducibility checks.

### `calculation_runs`

Stores future Hermes/backend calculation executions.

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

Allowed `status` values:
- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

Allowed `triggered_by` values:
- `web_ui`
- `hermes`
- `api`

Indexes:

```sql
CREATE INDEX idx_calculation_runs_project_id ON calculation_runs(project_id);
CREATE INDEX idx_calculation_runs_input_config_id ON calculation_runs(input_config_id);
CREATE INDEX idx_calculation_runs_status ON calculation_runs(status);
```

Notes:
- `report_json` can store structured report output for MVP.
- `markdown_report_path` can point to a generated Markdown artifact if file storage is used.

### `email_deliveries`

Stores future report email delivery attempts.

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

Allowed `status` values:
- `pending`
- `sent`
- `failed`
- `skipped`

Indexes:

```sql
CREATE INDEX idx_email_deliveries_run_id ON email_deliveries(calculation_run_id);
CREATE INDEX idx_email_deliveries_status ON email_deliveries(status);
```

---

## Data Flow

### Save New Config

```text
Frontend FormState
  -> backend serializes or receives YAML
  -> backend validates through S1/Inputs
  -> projects upsert by project_code
  -> input_configs insert version N+1
  -> return project_id + input_config_id + version
```

### Import Existing YAML

```text
Uploaded YAML
  -> backend parses YAML
  -> backend validates through S1/Inputs
  -> backend derives FormState where possible
  -> UI asks user for project metadata if missing
  -> input_configs insert with source=imported_yaml
```

### Hermes Calculation

```text
Hermes receives project_code or input_config_id
  -> backend loads input_configs.yaml_text
  -> backend validates current YAML
  -> backend runs brake_calc.workflow.runner
  -> calculation_runs updated
  -> report/email flow reads projects.email
```

---

## Repository Layer

Recommended backend files for implementation:

```text
src/brake_calc/storage/
  __init__.py
  db.py
  migrations.py
  repositories.py
  models.py
```

Responsibilities:

- `db.py`
  - Resolve database path.
  - Open SQLite connections.
  - Configure `PRAGMA foreign_keys = ON`.

- `migrations.py`
  - Create tables if missing.
  - Track schema version.

- `models.py`
  - Define small dataclasses or typed dicts for project/config/run records.

- `repositories.py`
  - `ProjectRepository`
  - `InputConfigRepository`
  - `CalculationRunRepository`
  - `EmailDeliveryRepository`

Do not let route handlers write raw SQL directly.

---

## Migration Strategy

MVP can use a simple schema metadata table:

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

Migration files are optional for MVP. A Python function can apply ordered SQL statements.

Recommended first migration:

```text
001_initial_storage_schema
```

Future migration candidates:
- Add user accounts.
- Add organization/project ownership.
- Add artifact storage records.
- Add cloud email provider metadata.
- Move from SQLite to Postgres if concurrency or deployment requires it.

---

## Implementation Tasks

### Task 1: Confirm Storage Location and Library

**Files:**
- Read: `AGENTS.md`
- No code changes yet

**Step 1: Confirm SQLite path behavior**

Choose:
- default `out/brake_calc.sqlite3`
- or approved new `data/brake_calc.sqlite3`

**Step 2: Confirm DB access library**

Choose:
- standard `sqlite3` for MVP
- SQLAlchemy if a migration/ORM dependency is approved

**Expected:** explicit decision before code changes.

### Task 2: Add Storage Package Skeleton

**Files:**
- Create: `src/brake_calc/storage/__init__.py`
- Create: `src/brake_calc/storage/db.py`
- Create: `src/brake_calc/storage/migrations.py`
- Test: `tests/unit/storage/test_migrations.py`

**Step 1: Write failing migration test**

Test that a new database can be initialized and contains the expected tables.

**Step 2: Implement connection helper**

Open SQLite connection and enable foreign keys.

**Step 3: Implement initial migration**

Create `projects`, `input_configs`, `calculation_runs`, `email_deliveries`, and `schema_migrations`.

**Step 4: Run tests**

Run:

```bash
uv run pytest tests/unit/storage/test_migrations.py -v
```

**Step 5: Commit**

```bash
git commit -m "feat(storage): add sqlite schema migrations"
```

### Task 3: Implement Project Repository

**Files:**
- Modify: `src/brake_calc/storage/repositories.py`
- Test: `tests/unit/storage/test_project_repository.py`

**Step 1: Write repository tests**

Cover:
- create project
- get by id
- get by project_code
- update metadata
- soft archive

**Step 2: Implement repository methods**

Use parameterized SQL only.

**Step 3: Run tests**

```bash
uv run pytest tests/unit/storage/test_project_repository.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(storage): persist project metadata"
```

### Task 4: Implement Input Config Repository

**Files:**
- Modify: `src/brake_calc/storage/repositories.py`
- Test: `tests/unit/storage/test_input_config_repository.py`

**Step 1: Write repository tests**

Cover:
- insert first version
- insert next version
- list configs for project
- fetch latest config
- fetch by id
- store validation errors JSON

**Step 2: Implement YAML hash helper**

Compute SHA-256 from UTF-8 YAML text.

**Step 3: Implement version increment**

Version is `max(version for project_id) + 1`.

**Step 4: Run tests**

```bash
uv run pytest tests/unit/storage/test_input_config_repository.py -v
```

**Step 5: Commit**

```bash
git commit -m "feat(storage): persist input yaml versions"
```

### Task 5: Implement Calculation Run Repository

**Files:**
- Modify: `src/brake_calc/storage/repositories.py`
- Test: `tests/unit/storage/test_calculation_run_repository.py`

**Step 1: Write repository tests**

Cover:
- create queued run
- mark running
- mark succeeded with report JSON
- mark failed with error JSON

**Step 2: Implement methods**

Keep methods small and explicit.

**Step 3: Run tests**

```bash
uv run pytest tests/unit/storage/test_calculation_run_repository.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(storage): track calculation runs"
```

### Task 6: Implement Email Delivery Repository

**Files:**
- Modify: `src/brake_calc/storage/repositories.py`
- Test: `tests/unit/storage/test_email_delivery_repository.py`

**Step 1: Write repository tests**

Cover:
- create pending delivery
- mark sent
- mark failed
- list deliveries for run

**Step 2: Implement methods**

Store provider response id and errors as nullable fields.

**Step 3: Run tests**

```bash
uv run pytest tests/unit/storage/test_email_delivery_repository.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(storage): track report email delivery"
```

### Task 7: Add Storage Integration Tests

**Files:**
- Test: `tests/integration/test_storage_config_lifecycle.py`

**Step 1: Write lifecycle test**

Flow:
- create project
- insert config version 1
- insert config version 2
- load latest
- create calculation run
- create email delivery

**Step 2: Run integration test**

```bash
uv run pytest tests/integration/test_storage_config_lifecycle.py -v
```

**Step 3: Commit**

```bash
git commit -m "test(storage): cover config lifecycle"
```

---

## Acceptance Criteria

- SQLite schema can be initialized on an empty database.
- Project metadata stores project name, project code/TKQ, email, note, timestamps.
- Each project supports multiple immutable config versions.
- YAML text and FormState JSON are stored together.
- Validation status and errors can be stored and retrieved.
- Future Hermes calculation runs can be tracked by config id.
- Future email delivery attempts can be tracked by run id.
- Tests use temporary database files and do not write to the developer's real database.

## Open Questions Before Implementation

1. Should the MVP default database path be `out/brake_calc.sqlite3`, or should a new `data/` directory be approved?
2. Should we use Python standard `sqlite3`, or introduce SQLAlchemy for structured migrations?
3. Should `project_code` be globally unique, or can two projects share a TKQ under different users later?
4. Should `email` be required before calculation/report sending, or optional until the user enables email delivery?
5. Should generated reports be stored as DB text, filesystem artifacts, or both?

## Suggested Next Plan

After this storage plan is approved, implement or refine:

```text
docs/plans/2026-04-23-input-yaml-backend-api.md
```

That plan should define web-facing APIs, Hermes-facing tool boundaries, validation, YAML import/export, calculation execution, and report email flow.
