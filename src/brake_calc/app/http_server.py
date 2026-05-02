from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from datetime import datetime, timezone

from brake_calc.app.api import (
    download_yaml,
    import_yaml,
    list_projects,
    load_config,
    open_latest_project_config,
    run_config,
    save_config,
)
from brake_calc.app.services import CalculationService, ConfigService, ValidationService, YamlImportService
from brake_calc.workflow.runner import run_workflow
from brake_calc.storage.db import connect_sqlite
from brake_calc.storage.migrations import initialize_database
from brake_calc.storage.repositories import (
    CalculationRunRepository,
    InputConfigRepository,
    ProjectRepository,
)


def _get_database_path() -> Path:
    configured = os.environ.get("BRAKE_CALC_DB_PATH", "out/brake_calc.db")
    return Path(configured)


def _build_config_service(db_path: Path) -> tuple[ConfigService, object]:
    connection = connect_sqlite(db_path)
    return (
        ConfigService(
            project_repository=ProjectRepository(connection),
            input_config_repository=InputConfigRepository(connection),
        ),
        connection,
    )


def _build_import_service() -> YamlImportService:
    return YamlImportService(validation_service=ValidationService())


def _build_calculation_service(db_path: Path) -> tuple[CalculationService, object]:
    connection = connect_sqlite(db_path)
    return (
        CalculationService(
            input_config_repository=InputConfigRepository(connection),
            calculation_run_repository=CalculationRunRepository(connection),
            validation_service=ValidationService(),
            run_workflow_fn=run_workflow,
            project_repository=ProjectRepository(connection),
        ),
        connection,
    )


def _attach_latest_run_payload(db_path: Path, payload: dict[str, object], input_config_id: str) -> dict[str, object]:
    connection = connect_sqlite(db_path)
    try:
        run_repository = CalculationRunRepository(connection)
        latest_run = run_repository.get_latest_for_input_config(input_config_id)
        if latest_run is None:
            payload["latest_run"] = None
            return payload
        payload["latest_run"] = {
            "calculation_run_id": latest_run.id,
            "status": latest_run.status,
            "report": None if latest_run.report_json is None else json.loads(latest_run.report_json),
            "created_at": latest_run.created_at,
        }
        return payload
    finally:
        connection.close()


app = FastAPI(title="brake-calc API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    db_path = _get_database_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    initialize_database(db_path)


@app.get("/api/health")
def health() -> dict[str, object]:
    return {"ok": True}


@app.post("/api/configs/import-yaml")
def import_yaml_route(request: dict[str, Any]) -> dict[str, object]:
    try:
        return import_yaml(request, import_service=_build_import_service())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/configs")
def save_config_route(request: dict[str, Any]) -> dict[str, object]:
    db_path = _get_database_path()
    config_service, connection = _build_config_service(db_path)
    try:
        result = save_config(request, config_service=config_service)
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        connection.close()


@app.get("/api/configs/{input_config_id}")
def load_config_route(input_config_id: str) -> dict[str, object]:
    db_path = _get_database_path()
    config_service, connection = _build_config_service(db_path)
    try:
        payload = load_config(input_config_id, config_service=config_service)
        return _attach_latest_run_payload(db_path, payload, input_config_id)
    except AssertionError as exc:
        raise HTTPException(status_code=404, detail="input_config_not_found") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        connection.close()


@app.get("/api/projects/{project_code}/latest-config")
def open_project_route(project_code: str) -> dict[str, object]:
    db_path = _get_database_path()
    config_service, connection = _build_config_service(db_path)
    try:
        payload = open_latest_project_config(project_code, config_service=config_service)
        config_payload = payload.get("config")
        if isinstance(config_payload, dict):
            payload["config"] = _attach_latest_run_payload(
                db_path,
                config_payload,
                str(payload["input_config_id"]),
            )
        return payload
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        connection.close()


@app.get("/api/projects")
def list_projects_route() -> dict[str, object]:
    db_path = _get_database_path()
    config_service, connection = _build_config_service(db_path)
    try:
        payload = list_projects(config_service=config_service)
        for item in payload.get("items", []):
            if not isinstance(item, dict):
                continue
            latest_input_config_id = item.get("latest_input_config_id")
            if isinstance(latest_input_config_id, str):
                latest = _attach_latest_run_payload(db_path, {}, latest_input_config_id).get("latest_run")
            else:
                latest = None
            item["latest_run"] = latest
        return payload
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        connection.close()


@app.get("/api/configs/{input_config_id}/download-yaml")
def download_yaml_route(input_config_id: str) -> dict[str, object]:
    db_path = _get_database_path()
    config_service, connection = _build_config_service(db_path)
    try:
        now = datetime.now(timezone.utc).isoformat()
        return download_yaml(input_config_id, created_at=now, config_service=config_service)
    except AssertionError as exc:
        raise HTTPException(status_code=404, detail="input_config_not_found") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        connection.close()


@app.post("/api/configs/{input_config_id}/run")
def run_config_route(input_config_id: str) -> dict[str, object]:
    db_path = _get_database_path()
    calculation_service, connection = _build_calculation_service(db_path)
    try:
        now = datetime.now(timezone.utc).isoformat()
        return run_config(
            input_config_id,
            {
                "triggered_by": "frontend",
                "created_at": now,
                "started_at": now,
                "finished_at": now,
            },
            calculation_service=calculation_service,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        connection.close()
