"""k(f) 校准纯函数。"""

from __future__ import annotations

from brake_calc.contracts.inputs import KCurve, KSegment


def resolve_brake_mode(brake_type_name: str, brake_type_source: str) -> str:
    """将制动类型映射到 k/fallback 使用的 brake mode。"""
    if brake_type_source == "copy_of_EB":
        return "EB"
    if brake_type_source == "ratio_of_FSB":
        return "FSB"
    return brake_type_name


def evaluate_segment(segment: KSegment, force_kn: float) -> float:
    """评估单个分段。"""
    if segment.kind == "constant":
        assert segment.value is not None
        return segment.value

    assert segment.start_value is not None
    assert segment.end_value is not None
    if segment.max_f == segment.min_f:
        return segment.end_value
    ratio = (force_kn - segment.min_f) / (segment.max_f - segment.min_f)
    return segment.start_value + (segment.end_value - segment.start_value) * ratio


def evaluate_k_curve(curve: KCurve, force_kn: float) -> tuple[float | None, bool]:
    """按力值评估 k(f)，返回值与是否越界。"""
    for segment in curve.segments:
        if segment.min_f <= force_kn <= segment.max_f:
            return evaluate_segment(segment, force_kn), False
    return None, True
