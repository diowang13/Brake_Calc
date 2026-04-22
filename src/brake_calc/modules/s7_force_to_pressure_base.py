"""基础压力换算模块。"""

from __future__ import annotations

import logging

from brake_calc.contracts.context import Context
from brake_calc.domain.pressure import derive_tread_pressure_parameters, force_to_pressure_kpa
from brake_calc.errors import InputValidationError

logger = logging.getLogger(__name__)


def run(ctx: Context) -> Context:
    """用踏面制动缸机械模型将制动力换算为基础压力。"""
    inputs = ctx.validated_inputs
    if inputs is None:
        raise InputValidationError("validated_inputs is required before s7")

    mech_params = inputs.mech_params
    k_initial, bcp0_initial = derive_tread_pressure_parameters(
        n_cylinders=inputs.n_cylinders_by_controller,
        sc=mech_params.Sc,
        xi=mech_params.xi,
        li=mech_params.Li,
        eta_i=mech_params.eta_i,
        lo=mech_params.Lo,
        eta_o=mech_params.eta_o,
        fs1=mech_params.Fs1,
        fs2=mech_params.Fs2,
    )

    base_pressures: dict[str, dict[str, dict[str, float]]] = {}
    for brake_type, per_group in ctx.F_by_controller.items():
        base_pressures[brake_type] = {}
        for load_group, per_controller in per_group.items():
            base_pressures[brake_type][load_group] = {}
            for controller, force in per_controller.items():
                base_pressures[brake_type][load_group][controller] = force_to_pressure_kpa(
                    force,
                    k_initial,
                    bcp0_initial,
                )
    return ctx.model_copy(
        update={
            "k_initial": k_initial,
            "BCP0_initial": bcp0_initial,
            "BCP_base_by_controller": base_pressures,
        }
    )
