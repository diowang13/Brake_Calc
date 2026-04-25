# Parking Brake Handoff

## Status

The deferred doc updates in this handoff were reconciled into `AGENTS.md` and `specs/Brake_Calc_ Workflow_Spec_v1.0.md` during the 2026-04-25 V1 acceptance wrap-up. This file remains only as historical handoff context.

## Deferred Doc Updates

These items were identified during V1 parking brake acceptance and should be reconciled later in `AGENTS.md` and `specs/Brake_Calc_ Workflow_Spec_v1.0.md` after business validation is complete.

- Clarify parking brake result granularity:
  - `F_N_PB` should mean per brake unit normal force (`kN`, both sides).
  - `F_PB` should mean per car parking brake force (`kN`).
  - whole-train values should remain separate totals.
- Clarify parking brake formula order:
  - `F_N_PB = ([(Fp - Fs2) * Lpi * eta_pi] - Fs1) * Lo * eta_o`
  - `F_PB = lever_ratio * F_N_PB * Np(i) * xi0`
- Clarify lever ratio reuse from base brake mechanical model:
  - `tread_cylinder`: lever ratio = `1`
  - `caliper_cylinder`: lever ratio = `2 * Rf / Dw`
- Clarify that current input field `static_friction_coefficient` is being used as the report/business coefficient `xi0` in parking brake force calculation.
- Reconcile report wording and table headers with the validated business formula and granularity.
