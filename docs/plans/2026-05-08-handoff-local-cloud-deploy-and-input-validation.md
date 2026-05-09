# 2026-05-08 Handoff: Local/Cloud Deploy + Input Validation Issue

## 1. 今日完成事项

1. 云端部署已打通（Docker Compose + Nginx + HTTPS）。
2. 域名访问正常：
   - `http://brakehub.cn` -> `301` 跳转 HTTPS
   - `https://brakehub.cn` -> `200`
   - `https://brakehub.cn/api/health` -> `{"ok":true}`
3. 宝塔面板已停止并清理，线上以 Docker 为主。
4. 新增/整理了运维文档：
   - `deploy/HERMES_DEPLOY_CN.md`
   - `deploy/HERMES_DIAG_503_CHECKLIST_CN.md`
   - `deploy/OPS_SOP_CN.md`
   - 外置目录：`D:\codeX\Brake_Calc_Agent\Brak_calc _maintain\HERMES_RUNBOOK_CN.md`

## 2. 当前核心问题（未解决）

在本地与云端均可复现：新建项目后运行报 `input_config_invalid`，提示缺失多个必填字段（示例）：

1. `mass_params.powered_bogie.rotational_mass_factor`
2. `mass_params.trailer_bogie.rotational_mass_factor`
3. `pressure_calibration.service_brake.BCP0`
4. `pressure_calibration.*.points.*.k_for_code`
5. `parking_brake_check.*` 下多个字段

## 3. 已确认事实与根因判断

### 3.1 云端环境确认

1. 云端目标机确认是同一台（腾讯云 NAT 架构，内网 `10.x` + 公网 `211.159.168.121`）。
2. 当前线上运行正常，但业务校验问题仍存在。

### 3.2 数据库状态

1. 云端当前 `app` 挂载 volume：`brake-calc_brake_calc_data` -> `/data`。
2. 当前 `/data/brake_calc.db` 为新库（仅见杭州项目），历史北京/成都数据不在该库。
3. 这说明历史数据曾发生库切换/重建（可能 `down -v` 或挂载切换导致）。

### 3.3 代码层问题

Hermes 核查与本地复现一致：`frontend/src/pages/WorkbenchPage.tsx` 中存在多个
`...(x !== undefined ? {key: x} : {})` 模式，输入框为空时会省略 key，导致 YAML 缺字段入库，运行阶段被后端契约拦截。

## 4. 约束与注意事项

1. 不要用“一刀切填 0”覆盖所有必填字段（与既有规则不一致）。
2. `rotational_mass_factor` 需遵循既定口径：
   - 字段定义：无量纲系数，`>= 0`
   - 公式：`mass_dynamic = mass_static[load_group] + mass_static[AW0] * rotational_mass_factor`
   - 现行运行口径（domain）：`powered_bogie=0.1`、`trailer_bogie=0.05`
3. 修复应优先“最小改动”，避免扩大行为变化范围。

## 5. 明日建议执行顺序

1. 先检查本地工作区状态（确认是否有临时改动残留）。
2. 回滚今日未确认的临时修补改动。
3. 仅对目标字段做最小修复：
   - 优先修 `rotational_mass_factor` 缺失路径；
   - 再评估 `pressure_calibration` / `parking_brake_check` 在 `enabled=false` 下的策略（前端补齐 vs 后端条件校验）。
4. 本地复测通过后再 push。
5. 云端执行：
   - `git pull`
   - `docker compose up -d --build`
   - 回归 `health` + 业务流程。

## 6. 明早开工第一步

```powershell
cd D:\codeX\Brake_Calc_Agent\Brake_Calc
git status
git log --oneline -n 5
```

