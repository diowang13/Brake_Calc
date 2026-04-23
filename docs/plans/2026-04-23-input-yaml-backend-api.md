# Input YAML Backend API and Hermes Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide backend APIs for the web UI and a Hermes-facing skill/tool boundary that can validate saved YAML, run brake-calc, persist results, and later send reports by email.

**Architecture:** The backend wraps existing brake-calc contracts and workflow modules instead of duplicating calculation logic. Web endpoints handle UI workflows such as validate/save/import/export; Hermes-facing functions operate on `project_code` or `input_config_id` and call `brake_calc.workflow.runner.run_workflow` with validated `Inputs`.

**Tech Stack:** Python backend using the existing `brake_calc` package. FastAPI is the recommended web API framework if adding a dependency is approved; otherwise use a minimal standard-library HTTP layer only for prototypes. YAML parsing should reuse existing `brake_calc.io.config` behavior where possible.

---

## Scope

In scope:
- Backend validation service using existing `Inputs`/S1 logic.
- YAML serialization/parsing service.
- Web UI APIs for validate, save, load, import, export.
- Hermes-facing calculation functions.
- Calculation run persistence hooks.
- Email delivery interface design.

Out of scope:
- Frontend implementation.
- SQLite schema implementation details.
- Actual email provider integration in MVP.
- Authentication and authorization.
- Production deployment infrastructure.

## Design Principles

- Reuse existing code paths:
  - `src/brake_calc/contracts/inputs.py`
  - `src/brake_calc/modules/s1_validate_inputs.py`
  - `src/brake_calc/workflow/runner.py`
  - `src/brake_calc/io/config.py`
  - `src/brake_calc/io/report.py`
- Treat S1/`Inputs.model_validate` as authoritative validation.
- Keep web metadata separate from `Inputs`.
- Backend must accept both:
  - direct YAML text
  - saved `input_config_id`
- Hermes should not depend on browser-only state.
- Calculation functions should be importable and callable without a web server.

---

## Backend Package Layout

Recommended files:

```text
src/brake_calc/app/
  __init__.py
  schemas.py
  services.py
  api.py
  hermes_tools.py
  email.py
```

Responsibilities:

- `schemas.py`
  - Request/response pydantic models for API boundary.

- `services.py`
  - Validation service.
  - YAML import/export service.
  - Config save/load orchestration.
  - Calculation orchestration.

- `api.py`
  - HTTP routes if FastAPI or similar framework is approved.

- `hermes_tools.py`
  - Importable functions intended to become Hermes skill/tool entry points.

- `email.py`
  - Email delivery interface and no-op/dev implementation.

Do not put web route logic inside workflow modules.

---

## API Data Contracts

### Shared Metadata Shape

```json
{
  "project_name": "示例项目",
  "project_code": "TKQ001",
  "email": "user@example.com",
  "note": "optional"
}
```

### Validation Error Shape

```json
{
  "path": "mass_params.powered_bogie.mass_static.AW0",
  "message": "mass_static values must be > 0",
  "severity": "error"
}
```

Notes:
- Convert pydantic location tuples into dot paths.
- Keep original backend error message for traceability.
- Frontend maps dot paths to fields where possible.

---

## Web API Endpoints

### `POST /api/configs/validate`

Purpose: validate generated YAML or Inputs JSON before save/export.

Request options:

```json
{
  "yaml_text": "v0: 80.0\n..."
}
```

or:

```json
{
  "inputs": {
    "v0": 80.0
  }
}
```

Response:

```json
{
  "valid": true,
  "errors": [],
  "normalized_inputs": {}
}
```

Behavior:
- Parse YAML if `yaml_text` is provided.
- Validate through `Inputs.model_validate` and/or S1.
- Return normalized inputs if validation passes.

### `POST /api/configs`

Purpose: save project metadata plus a generated config version.

Request:

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

Response:

```json
{
  "project_id": "uuid",
  "input_config_id": "uuid",
  "version": 1,
  "validation_status": "valid",
  "errors": []
}
```

Behavior:
- Upsert or create project by `project_code`.
- Validate YAML.
- Insert immutable config version.

### `GET /api/projects`

Purpose: search project metadata.

Query params:
- `q`
- `project_code`
- `email`

Response:

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

Purpose: list saved config versions.

Response:

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

Purpose: load one saved config for editing.

Response:

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

Purpose: import existing YAML and convert it into UI state.

Request:

```json
{
  "yaml_text": "v0: 80.0\n..."
}
```

Response:

```json
{
  "valid": true,
  "errors": [],
  "inputs": {},
  "form_state": {}
}
```

Behavior:
- Parse YAML.
- Validate.
- Best-effort derive FormState.
- If project metadata is absent, leave project fields blank.

### `GET /api/configs/{input_config_id}/download`

Purpose: download YAML with deterministic filename.

Response:
- Content-Type: YAML/text.
- Content-Disposition filename:

```text
{project_code}_input_{YYYYMMDD_HHmm}.yaml
```

### `POST /api/configs/{input_config_id}/run`

Purpose: run brake calculation from saved config.

Response:

```json
{
  "calculation_run_id": "uuid",
  "status": "succeeded",
  "report": {},
  "warnings": []
}
```

MVP can make this synchronous. Cloud deployment may later make it queued/asynchronous.

### `POST /api/runs/{calculation_run_id}/send-email`

Purpose: send report email to project email.

MVP behavior:
- May use no-op/dev email sender.
- Should create an `email_deliveries` record.

---

## Hermes Tool Boundary

Hermes should call importable Python functions, not scrape HTTP unless deployment requires HTTP.

Recommended functions in `src/brake_calc/app/hermes_tools.py`:

```python
def validate_saved_config(input_config_id: str) -> dict[str, object]:
    """Validate a saved input configuration and return validation results."""

def run_saved_config(input_config_id: str) -> dict[str, object]:
    """Run brake-calc for a saved input configuration and persist the run result."""

def run_latest_project_config(project_code: str) -> dict[str, object]:
    """Run brake-calc for the latest valid config of a project."""

def send_latest_report(project_code: str) -> dict[str, object]:
    """Send the latest successful report to the project's stored email."""
```

Tool behavior:
- Load YAML from storage.
- Validate via `Inputs`.
- Call `run_workflow(inputs)`.
- Persist `calculation_runs`.
- Optionally generate Markdown through existing report output utilities.
- Return compact machine-readable summaries to Hermes.

Hermes input should prefer:
- `input_config_id` for exact reproducibility.
- `project_code` only when the user wants latest config.

---

## Service Layer

### `ValidationService`

Responsibilities:
- Parse YAML text.
- Validate data against `Inputs`.
- Optionally run S1.
- Return normalized errors.

Important implementation note:
- If S1 wraps `Inputs.model_validate`, use S1 for consistency.
- If S1 expects a Context object, expose a lighter validation function that shares the same validation path rather than duplicating rules.

### `ConfigService`

Responsibilities:
- Save metadata and config version.
- Load config version.
- Import YAML into normalized input data.
- Generate export filename.

### `CalculationService`

Responsibilities:
- Load saved config.
- Validate before run.
- Convert validated inputs to `Inputs`.
- Call `brake_calc.workflow.runner.run_workflow`.
- Store result/error in `calculation_runs`.

### `EmailService`

Responsibilities:
- Check project email exists.
- Find report artifact or report JSON.
- Send email through configured provider later.
- MVP can implement a no-op sender that records `skipped` or `sent_dev`.

---

## Implementation Tasks

### Task 1: Confirm Web Framework and Dependency Policy

**Files:**
- Read: `pyproject.toml`
- Read: `AGENTS.md`
- No code changes yet

**Step 1: Decide framework**

Options:
- FastAPI, recommended for real cloud API.
- Flask, acceptable but less typed.
- No HTTP server yet, service functions only.

**Step 2: If adding a dependency, update spec/approval path**

AGENTS says new third-party dependencies require human confirmation.

**Expected:** explicit user approval before adding web dependencies.

### Task 2: Add Backend App Package Skeleton

**Files:**
- Create: `src/brake_calc/app/__init__.py`
- Create: `src/brake_calc/app/schemas.py`
- Create: `src/brake_calc/app/services.py`
- Test: `tests/unit/app/test_validation_service.py`

**Step 1: Write failing validation service test**

Use `configs/example_input.yaml` text and expect validation success.

**Step 2: Implement minimal `ValidationService`**

Parse YAML and validate with `Inputs.model_validate`.

**Step 3: Run test**

```bash
uv run pytest tests/unit/app/test_validation_service.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(app): add input validation service"
```

### Task 3: Normalize Validation Errors

**Files:**
- Modify: `src/brake_calc/app/services.py`
- Test: `tests/unit/app/test_validation_service.py`

**Step 1: Add invalid YAML tests**

Cover:
- missing EB
- invalid mass
- invalid controller type

**Step 2: Implement error normalization**

Return dot paths and messages.

**Step 3: Run tests**

```bash
uv run pytest tests/unit/app/test_validation_service.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(app): normalize input validation errors"
```

### Task 4: Add Config Service

**Files:**
- Modify: `src/brake_calc/app/services.py`
- Test: `tests/unit/app/test_config_service.py`

**Step 1: Write tests with fake repositories**

Cover:
- save valid config
- save invalid config records validation errors
- generate export filename

**Step 2: Implement `ConfigService`**

Coordinate validation and storage repositories.

**Step 3: Run tests**

```bash
uv run pytest tests/unit/app/test_config_service.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(app): save and load input configs"
```

### Task 5: Add YAML Import Conversion Service

**Files:**
- Modify: `src/brake_calc/app/services.py`
- Test: `tests/unit/app/test_yaml_import_service.py`

**Step 1: Write import tests**

Use `configs/example_input.yaml` and verify:
- valid result
- project metadata blank
- FormState contains six bogies for example config
- bogie names preserve `trailer_bogie_1` style

**Step 2: Implement best-effort FormState conversion**

Convert backend Inputs into UI FormState shape.

**Step 3: Run tests**

```bash
uv run pytest tests/unit/app/test_yaml_import_service.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(app): import yaml into ui form state"
```

### Task 6: Add Calculation Service

**Files:**
- Modify: `src/brake_calc/app/services.py`
- Test: `tests/unit/app/test_calculation_service.py`

**Step 1: Write tests using example input**

Mock or use temporary storage repository.

**Step 2: Implement saved config run**

Load YAML, validate, call `run_workflow`.

**Step 3: Persist run status**

Store success and failure states.

**Step 4: Run tests**

```bash
uv run pytest tests/unit/app/test_calculation_service.py -v
```

**Step 5: Commit**

```bash
git commit -m "feat(app): run saved brake calculation configs"
```

### Task 7: Add Hermes Tool Functions

**Files:**
- Create: `src/brake_calc/app/hermes_tools.py`
- Test: `tests/unit/app/test_hermes_tools.py`

**Step 1: Write tests with fake services**

Cover:
- validate saved config
- run by input_config_id
- run latest by project_code
- missing email for report send

**Step 2: Implement tool wrappers**

Keep each function small and return JSON-serializable dicts.

**Step 3: Run tests**

```bash
uv run pytest tests/unit/app/test_hermes_tools.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(app): expose hermes calculation tools"
```

### Task 8: Add HTTP API Routes

**Files:**
- Create/modify: `src/brake_calc/app/api.py`
- Test: `tests/unit/app/test_api.py`

**Step 1: Write API tests**

Use the selected framework's test client.

**Step 2: Implement validate/save/load/import/download routes**

Wire routes to service layer only.

**Step 3: Implement run route**

MVP may be synchronous.

**Step 4: Run tests**

```bash
uv run pytest tests/unit/app/test_api.py -v
```

**Step 5: Commit**

```bash
git commit -m "feat(app): add web api for input configs"
```

### Task 9: Add Email Service Interface

**Files:**
- Create: `src/brake_calc/app/email.py`
- Test: `tests/unit/app/test_email_service.py`

**Step 1: Write no-op sender tests**

Cover:
- missing email
- pending delivery created
- no-op success/skipped behavior

**Step 2: Implement interface**

Define an email sender protocol and no-op implementation.

**Step 3: Run tests**

```bash
uv run pytest tests/unit/app/test_email_service.py -v
```

**Step 4: Commit**

```bash
git commit -m "feat(app): add report email service interface"
```

### Task 10: End-to-End Backend Test

**Files:**
- Test: `tests/integration/test_app_config_to_report_flow.py`

**Step 1: Write integration test**

Flow:
- save project metadata and example YAML
- validate config
- run calculation
- store report
- create email delivery record with no-op sender

**Step 2: Run integration test**

```bash
uv run pytest tests/integration/test_app_config_to_report_flow.py -v
```

**Step 3: Run relevant full checks**

```bash
uv run ruff check src tests
uv run mypy src
uv run pytest
```

**Step 4: Commit**

```bash
git commit -m "test(app): cover config to report backend flow"
```

---

## Acceptance Criteria

- Backend validates generated YAML through existing `Inputs`/S1 logic.
- API can save project metadata and config YAML without writing metadata into YAML.
- API can load saved configs for UI editing.
- API can import existing YAML and return a UI-compatible FormState.
- API can export YAML with `{project_code}_input_{YYYYMMDD_HHmm}.yaml`.
- Hermes-facing functions can run saved configs by `input_config_id` or latest config by `project_code`.
- Calculation runs are persisted with success/failure status.
- Email sending has a clear interface and MVP no-op behavior.
- Tests cover validation, save/load, import/export, Hermes tool functions, and config-to-report flow.

## Open Questions Before Implementation

1. Is FastAPI approved as a new dependency for the cloud backend?
2. Should Hermes call Python functions directly, HTTP endpoints, or both?
3. Should config runs be synchronous in MVP, or should the backend create queued jobs immediately?
4. Where should Markdown reports be stored in cloud deployment: database, filesystem volume, object storage, or all three?
5. Which email provider should be used later, and does the server environment allow SMTP?
6. Should API responses expose full report JSON to the web UI, or only summary plus download links?

## Suggested Execution Order

Recommended order across all three plans:

1. Finish frontend UI plan enough to define FormState.
2. Implement SQLite storage plan.
3. Implement backend service/API plan.
4. Connect frontend to backend validation/save/import/export.
5. Add Hermes tool registration/deployment packaging.
