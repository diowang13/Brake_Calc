from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol


class HermesServiceProtocol(Protocol):
    def validate_saved_config(self, input_config_id: str) -> dict[str, object] | object: ...
    def run_saved_config(self, input_config_id: str) -> dict[str, object] | object: ...
    def run_latest_project_config(self, project_code: str) -> dict[str, object] | object: ...


def _as_dict(value: dict[str, object] | object) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    if hasattr(value, "__dict__"):
        data = {
            key: item
            for key, item in vars(value).items()
            if not key.startswith("_")
        }
        return data
    raise TypeError("Hermes wrapper expected JSON-serializable object")


def validate_saved_config(
    input_config_id: str,
    *,
    service: HermesServiceProtocol,
) -> dict[str, object]:
    return _as_dict(service.validate_saved_config(input_config_id))


def run_saved_config(
    input_config_id: str,
    *,
    service: HermesServiceProtocol,
) -> dict[str, object]:
    return _as_dict(service.run_saved_config(input_config_id))


def run_latest_project_config(
    project_code: str,
    *,
    service: HermesServiceProtocol,
) -> dict[str, object]:
    return _as_dict(service.run_latest_project_config(project_code))


def send_latest_report(project_code: str, *, service: HermesServiceProtocol) -> dict[str, object]:
    payload = _as_dict(service.run_latest_project_config(project_code))
    payload.setdefault("sent_at", datetime.now(timezone.utc).isoformat())
    return payload
