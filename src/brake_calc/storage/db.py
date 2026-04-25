from __future__ import annotations

import sqlite3
from pathlib import Path


def connect_sqlite(database_path: str | Path) -> sqlite3.Connection:
    """创建启用外键约束的 SQLite 连接。"""
    connection = sqlite3.connect(Path(database_path))
    connection.execute("PRAGMA foreign_keys = ON")
    return connection
