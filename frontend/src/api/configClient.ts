import type {
  ImportYamlResult,
  LoadConfigResult,
  RunConfigResult,
  SaveConfigRequestPayload,
  SaveConfigResult,
} from "../contracts/config";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function loadConfig(inputConfigId: string): Promise<LoadConfigResult> {
  const response = await fetch(`${API_BASE_URL}/api/configs/${inputConfigId}`);
  if (!response.ok) {
    throw new Error(`load_config_failed:${response.status}`);
  }
  return (await response.json()) as LoadConfigResult;
}

export async function saveConfig(payload: SaveConfigRequestPayload): Promise<SaveConfigResult> {
  const response = await fetch(`${API_BASE_URL}/api/configs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`save_config_failed:${response.status}`);
  }
  return (await response.json()) as SaveConfigResult;
}

export async function importYaml(yamlText: string): Promise<ImportYamlResult> {
  const response = await fetch(`${API_BASE_URL}/api/configs/import-yaml`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ yaml_text: yamlText }),
  });
  if (!response.ok) {
    throw new Error(`import_yaml_failed:${response.status}`);
  }
  return (await response.json()) as ImportYamlResult;
}

export async function runConfig(inputConfigId: string): Promise<RunConfigResult> {
  const response = await fetch(`${API_BASE_URL}/api/configs/${inputConfigId}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string" && payload.detail.length > 0) {
        detail = payload.detail;
      }
    } catch {
      detail = "";
    }
    throw new Error(
      detail.length > 0 ? `run_config_failed:${response.status}:${detail}` : `run_config_failed:${response.status}`
    );
  }
  return (await response.json()) as RunConfigResult;
}
