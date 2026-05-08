export type ParkingBrakePerCarResult = {
  F_N_PB: number;
  F_PB: number;
  incline_force: number;
  safety_margin: number;
};

export type ParkingBrakeWholeTrainResult = {
  F_PB: number;
  incline_force: number;
  safety_margin: number;
};

export type ParkingBrakeCheckResult = {
  per_car: Record<string, ParkingBrakePerCarResult>;
  whole_train: ParkingBrakeWholeTrainResult;
  pass: boolean;
};

export type Report = {
  parking_brake_check_result: ParkingBrakeCheckResult | null;
  parking_brake_check_results_by_load_group: Record<string, ParkingBrakeCheckResult>;
  theoretical_speed_checks?: Record<string, Record<string, Record<string, number>>>;
  load_summary?: Record<string, Record<string, { mass_dynamic?: number; spring_pressure?: number }>>;
  controller_pressure_standards?: Record<string, Record<string, Record<string, number>>>;
  controller_code_params?: Record<string, unknown>;
  mass_dyn_formula_by_bogie_type?: Record<
    string,
    {
      k?: number;
      b?: number;
      aw0?: { spring_kPa?: number; mass_dyn_t?: number };
      aw3?: { spring_kPa?: number; mass_dyn_t?: number };
      formula?: string;
    }
  >;
  calibration_summary?: Record<string, unknown>;
  auto_adjustments?: Array<{ code?: string; message?: string }>;
  warnings?: Array<{ code?: string; message?: string }>;
};
