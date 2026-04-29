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
};
