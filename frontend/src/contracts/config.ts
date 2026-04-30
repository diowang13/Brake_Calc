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
