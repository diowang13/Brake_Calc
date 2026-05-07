export type ProjectPayload = {
  project_name: string;
  project_code: string;
  email: string | null;
  note: string;
};

export type ValidationErrorItem = {
  path: string;
  message: string;
};

export type LoadConfigResult = {
  project: ProjectPayload;
  yaml_text: string;
  form_state: Record<string, unknown>;
  validation_status: string;
  errors: ValidationErrorItem[];
  version: number;
  source_input_config_id: string | null;
  revision_reason: string | null;
  latest_run?: {
    calculation_run_id: string;
    status: string;
    report: Record<string, unknown> | null;
    created_at: string;
  } | null;
};

export type SaveConfigRequestPayload = {
  project: ProjectPayload;
  yaml_text: string;
  form_state: Record<string, unknown>;
  validation_status: string;
  errors: Array<{ path: string; message: string }>;
  created_at: string;
  source_input_config_id?: string;
  revision_reason?: string;
};

export type SaveConfigResult = {
  project_id: string;
  input_config_id: string;
  version: number;
  validation_status: string;
  errors: ValidationErrorItem[];
};

export type ImportYamlResult = {
  valid: boolean;
  errors: ValidationErrorItem[];
  inputs: Record<string, unknown> | null;
  form_state: Record<string, unknown> | null;
};

export type SupplementPresence = {
  hasParkingBrakeCheck: boolean;
  hasPressureCalibration: boolean;
  hasElectricBrake: boolean;
};

export type RunConfigResult = {
  calculation_run_id: string;
  status: string;
  report: Record<string, unknown>;
  warnings: unknown[];
};

export type PreviewCalibrationResult = {
  service_bcp0?: number | null;
  emergency_bcp0?: number | null;
  service_k_by_load_group?: Record<string, number>;
  emergency_k_by_load_group?: Record<string, number>;
};

export type OpenProjectResult = {
  input_config_id: string;
  config: LoadConfigResult;
};

export type DownloadYamlResult = {
  filename: string;
  yaml_text: string;
};

export type ProjectListItem = {
  project_name: string;
  project_code: string;
  updated_at: string;
  latest_input_config_id: string | null;
  controller_type?: "car" | "bogie" | null;
  latest_run?: {
    calculation_run_id: string;
    status: string;
    report: Record<string, unknown> | null;
    created_at: string;
  } | null;
};

export type ListProjectsResult = {
  items: ProjectListItem[];
};

export type ProjectVersionListItem = {
  input_config_id: string;
  version: number;
  created_at: string;
  latest_run?: {
    calculation_run_id: string;
    status: string;
    report: Record<string, unknown> | null;
    created_at: string;
  } | null;
};

export type ListProjectVersionsResult = {
  items: ProjectVersionListItem[];
};
