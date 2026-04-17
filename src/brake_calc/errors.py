"""自定义异常类型。"""


class BrakeCalcError(Exception):
    """基础领域异常。"""


class InputValidationError(BrakeCalcError):
    """输入校验失败。"""

