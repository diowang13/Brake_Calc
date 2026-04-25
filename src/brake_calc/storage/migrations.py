from __future__ import annotations

from pathlib import Path

from brake_calc.storage.db import connect_sqlite

INITIAL_SCHEMA_VERSION = "001_initial_storage_schema"

INITIAL_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    project_code TEXT NOT NULL UNIQUE,
    email TEXT,
    note TEXT NOT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS input_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    schema_version INTEGER NOT NULL,
    yaml_text TEXT NOT NULL,
    form_state_json TEXT NOT NULL,
    yaml_sha256 TEXT NOT NULL,
    validation_status TEXT NOT NULL,
    validation_errors_json TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    exported_filename TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    UNIQUE(project_id, version)
);

CREATE TABLE IF NOT EXISTS calculation_runs (
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
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (input_config_id) REFERENCES input_configs(id)
);

CREATE TABLE IF NOT EXISTS email_deliveries (
    id TEXT PRIMARY KEY,
    calculation_run_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_message_id TEXT,
    error_json TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (calculation_run_id) REFERENCES calculation_runs(id)
);
"""


def initialize_database(database_path: str | Path) -> None:
    """初始化 SQLite schema，并记录已应用 migration。"""
    with connect_sqlite(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        applied = connection.execute(
            "SELECT 1 FROM schema_migrations WHERE version = ?",
            (INITIAL_SCHEMA_VERSION,),
        ).fetchone()
        if applied is not None:
            return

        connection.executescript(INITIAL_SCHEMA_SQL)
        connection.execute(
            "INSERT INTO schema_migrations(version) VALUES (?)",
            (INITIAL_SCHEMA_VERSION,),
        )
        connection.commit()
