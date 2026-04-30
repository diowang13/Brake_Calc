from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from brake_calc.app.api import import_yaml, load_config, save_config
from brake_calc.app.services import ConfigService, ValidationService, YamlImportService
from brake_calc.storage.db import connect_sqlite
from brake_calc.storage.migrations import initialize_database
from brake_calc.storage.repositories import InputConfigRepository, ProjectRepository


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
        return load_config(input_config_id, config_service=config_service)
    except AssertionError as exc:
        raise HTTPException(status_code=404, detail="input_config_not_found") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        connection.close()
