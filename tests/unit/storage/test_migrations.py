from __future__ import annotations

import sqlite3
from pathlib import Path

from brake_calc.storage.db import connect_sqlite
from brake_calc.storage.migrations import initialize_database


def list_table_names(database_path: Path) -> set[str]:
    with sqlite3.connect(database_path) as connection:
        rows = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            """
        ).fetchall()
    return {row[0] for row in rows}


def test_initialize_database_creates_core_tables(tmp_path: Path) -> None:
    database_path = tmp_path / "storage.sqlite3"

    initialize_database(database_path)

    assert {
        "calculation_runs",
        "email_deliveries",
        "input_configs",
        "projects",
        "schema_migrations",
    }.issubset(list_table_names(database_path))


def test_connect_sqlite_enables_foreign_keys(tmp_path: Path) -> None:
    database_path = tmp_path / "storage.sqlite3"

    with connect_sqlite(database_path) as connection:
        pragma_value = connection.execute("PRAGMA foreign_keys").fetchone()

    assert pragma_value == (1,)


def test_initialize_database_records_initial_migration(tmp_path: Path) -> None:
    database_path = tmp_path / "storage.sqlite3"

    initialize_database(database_path)

    with sqlite3.connect(database_path) as connection:
        applied_migrations = connection.execute(
            "SELECT version FROM schema_migrations ORDER BY version"
        ).fetchall()

    assert applied_migrations == [("001_initial_storage_schema",)]
