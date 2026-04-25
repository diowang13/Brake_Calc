from __future__ import annotations

from brake_calc.app.schemas import ProjectPayload, SaveConfigRequest


def _serialize(obj: object) -> dict[str, object]:
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "__dict__") and vars(obj):
        source = vars(obj)
    else:
        source = {
            key: getattr(obj, key)
            for key in dir(obj)
            if not key.startswith("_") and not callable(getattr(obj, key))
        }

    data: dict[str, object] = {}
    for key, value in source.items():
        if hasattr(value, "__dict__") and not isinstance(value, (str, bytes, bytearray)):
            data[key] = _serialize(value)
        else:
            data[key] = value
    return data


def validate_config(request: dict[str, object], *, validation_service: object) -> dict[str, object]:
    if "yaml_text" in request:
        result = validation_service.validate_yaml_text(str(request["yaml_text"]))  # type: ignore[attr-defined]
    else:
        inputs = request.get("inputs")
        assert isinstance(inputs, dict)
        result = validation_service.validate_inputs_payload(inputs)  # type: ignore[attr-defined]
    return _serialize(result)


def save_config(request: dict[str, object], *, config_service: object) -> dict[str, object]:
    project = request["project"]
    assert isinstance(project, dict)
    form_state = request["form_state"]
    assert isinstance(form_state, dict)
    errors = request.get("errors", [])
    assert isinstance(errors, list)
    result = config_service.save_config(  # type: ignore[attr-defined]
        SaveConfigRequest(
            project=ProjectPayload(
                project_name=str(project["project_name"]),
                project_code=str(project["project_code"]),
                email=None if project.get("email") is None else str(project["email"]),
                note=str(project.get("note", "")),
            ),
            yaml_text=str(request["yaml_text"]),
            form_state=form_state,
            validation_status=str(request.get("validation_status", "not_validated")),
            errors=errors,
            created_at=str(request["created_at"]),
        )
    )
    return _serialize(result)


def load_config(input_config_id: str, *, config_service: object) -> dict[str, object]:
    return _serialize(config_service.load_config(input_config_id))  # type: ignore[attr-defined]


def import_yaml(request: dict[str, object], *, import_service: object) -> dict[str, object]:
    return _serialize(import_service.import_yaml(str(request["yaml_text"])))  # type: ignore[attr-defined]


def download_yaml(
    input_config_id: str,
    *,
    created_at: str,
    config_service: object,
) -> dict[str, object]:
    loaded = config_service.load_config(input_config_id)  # type: ignore[attr-defined]
    filename = config_service.build_export_filename(  # type: ignore[attr-defined]
        project_code=loaded.project.project_code,
        created_at=created_at,
    )
    return {"filename": filename, "yaml_text": loaded.yaml_text}


def run_config(
    input_config_id: str,
    request: dict[str, object],
    *,
    calculation_service: object,
) -> dict[str, object]:
    result = calculation_service.run_saved_config(  # type: ignore[attr-defined]
        input_config_id=input_config_id,
        triggered_by=str(request["triggered_by"]),
        created_at=str(request["created_at"]),
        started_at=str(request["started_at"]),
        finished_at=str(request["finished_at"]),
    )
    return _serialize(result)
