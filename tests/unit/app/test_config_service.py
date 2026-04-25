from __future__ import annotations

import json

from brake_calc.app.schemas import ProjectPayload
from brake_calc.app.services import ConfigService, SaveConfigRequest, ValidationErrorItem


class FakeProject:
    def __init__(
        self,
        *,
        project_id: str,
        project_name: str,
        project_code: str,
        email: str | None,
        note: str,
        created_at: str,
        updated_at: str,
    ) -> None:
        self.id = project_id
        self.project_name = project_name
        self.project_code = project_code
        self.email = email
        self.note = note
        self.is_archived = False
        self.archived_at = None
        self.created_at = created_at
        self.updated_at = updated_at


class FakeInputConfig:
    def __init__(
        self,
        *,
        input_config_id: str,
        project_id: str,
        version: int,
        schema_version: int,
        yaml_text: str,
        form_state_json: str,
        validation_status: str,
        validation_errors_json: str,
        created_at: str,
    ) -> None:
        self.id = input_config_id
        self.project_id = project_id
        self.version = version
        self.schema_version = schema_version
        self.yaml_text = yaml_text
        self.form_state_json = form_state_json
        self.yaml_sha256 = "sha"
        self.validation_status = validation_status
        self.validation_errors_json = validation_errors_json
        self.source = "manual_save"
        self.created_at = created_at
        self.exported_filename = None


class FakeProjectRepository:
    def __init__(self) -> None:
        self.project: FakeProject | None = None

    def get_by_project_code(self, project_code: str) -> FakeProject | None:
        if self.project is not None and self.project.project_code == project_code:
            return self.project
        return None

    def create(
        self,
        *,
        project_name: str,
        project_code: str,
        email: str | None,
        note: str,
        created_at: str,
    ) -> FakeProject:
        self.project = FakeProject(
            project_id="project-1",
            project_name=project_name,
            project_code=project_code,
            email=email,
            note=note,
            created_at=created_at,
            updated_at=created_at,
        )
        return self.project

    def update(
        self,
        *,
        project_id: str,
        project_name: str,
        email: str | None,
        note: str,
        updated_at: str,
    ) -> FakeProject:
        assert self.project is not None
        self.project.project_name = project_name
        self.project.email = email
        self.project.note = note
        self.project.updated_at = updated_at
        return self.project

    def get(self, project_id: str) -> FakeProject | None:
        if self.project is not None and self.project.id == project_id:
            return self.project
        return None


class FakeInputConfigRepository:
    def __init__(self) -> None:
        self.items: dict[str, FakeInputConfig] = {}

    def create(
        self,
        *,
        project_id: str,
        schema_version: int,
        yaml_text: str,
        form_state: object,
        validation_status: str,
        validation_errors: object,
        source: str,
        created_at: str,
        exported_filename: str | None = None,
    ) -> FakeInputConfig:
        item = FakeInputConfig(
            input_config_id=f"input-{len(self.items) + 1}",
            project_id=project_id,
            version=len(self.items) + 1,
            schema_version=schema_version,
            yaml_text=yaml_text,
            form_state_json=json.dumps(form_state, ensure_ascii=True, sort_keys=True),
            validation_status=validation_status,
            validation_errors_json=json.dumps(validation_errors, ensure_ascii=True, sort_keys=True),
            created_at=created_at,
        )
        self.items[item.id] = item
        return item

    def get(self, input_config_id: str) -> FakeInputConfig | None:
        return self.items.get(input_config_id)


def test_config_service_saves_project_and_input_config() -> None:
    service = ConfigService(
        project_repository=FakeProjectRepository(),
        input_config_repository=FakeInputConfigRepository(),
    )

    result = service.save_config(
        SaveConfigRequest(
            project=ProjectPayload(
                project_name="Line 1",
                project_code="LINE-001",
                email="ops@example.com",
                note="draft",
            ),
            yaml_text="schema_version: 1\nv0: 80\n",
            form_state={"schema_version": 1, "v0": 80},
            validation_status="valid",
            errors=[],
            created_at="2026-04-25T12:00:00Z",
        )
    )

    assert result.project_id == "project-1"
    assert result.input_config_id == "input-1"
    assert result.version == 1
    assert result.validation_status == "valid"


def test_config_service_loads_saved_config() -> None:
    project_repository = FakeProjectRepository()
    input_config_repository = FakeInputConfigRepository()
    service = ConfigService(
        project_repository=project_repository,
        input_config_repository=input_config_repository,
    )
    saved = service.save_config(
        SaveConfigRequest(
            project=ProjectPayload(
                project_name="Line 1",
                project_code="LINE-001",
                email=None,
                note="draft",
            ),
            yaml_text="schema_version: 1\nv0: 80\n",
            form_state={"schema_version": 1, "v0": 80},
            validation_status="invalid",
            errors=[ValidationErrorItem(path="v0", message="must be positive")],
            created_at="2026-04-25T12:00:00Z",
        )
    )

    loaded = service.load_config(saved.input_config_id)

    assert loaded.project.project_code == "LINE-001"
    assert loaded.yaml_text == "schema_version: 1\nv0: 80\n"
    assert loaded.form_state["schema_version"] == 1
    assert loaded.validation_status == "invalid"
    assert loaded.errors[0].path == "v0"


def test_config_service_generates_export_filename_from_project_code_and_timestamp() -> None:
    service = ConfigService(
        project_repository=FakeProjectRepository(),
        input_config_repository=FakeInputConfigRepository(),
    )

    filename = service.build_export_filename(
        project_code="LINE-001",
        created_at="2026-04-25T12:34:56Z",
    )

    assert filename == "LINE-001_input_20260425_1234.yaml"
