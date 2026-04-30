# 前端 Follow-up Handoff（阶段收口后）

日期：2026-04-30  
范围：导入主路径收口后，自查发现的剩余联调问题（供下一阶段处理）。

## 结论摘要

自查确认存在 3 个后续问题：

1. 运行成功后返回只读总览，状态未实时反映“已运行”。
2. 工作台“下载 YAML”按钮目前仅有 UI，无实际导出动作。
3. 运行结果已写入 SQLite（`calculation_runs.report_json`），但前端尚未接入“从历史运行读取并回显”的链路。

---

## 1) 总览页运行状态未实时更新

- 现象：
  - 在工作台点击“运行”成功后，进入结果页正常；
  - 从结果页返回总览时，总览仍按“导入未运行版本”口径展示（`查看结果`禁用/文案未运行）。
- 根因（前端）：
  - `OverviewPage` 以 `overviewData !== null` 推导 `isImportedVersion`，并用 `hasRunRecord = !isImportedVersion`。
  - `App.tsx` 中运行成功只更新 `runtimeStatus/runtimeReport`，未把“本版本已运行”状态回写到总览态模型。
- 影响：
  - 用户感知为“运行状态不同步”，只读总览不能作为当次运行后的即时事实页。
- 建议修复：
  - 方案 A（推荐，最小改动）：总览页接收 `runtimeStatus`，当 `runtimeStatus === "succeeded"` 时覆盖 `hasRunRecord=true` 的展示与按钮可用性。
  - 方案 B（更完整）：新增后端“latest run by input_config_id”查询接口，总览按真实 `calculation_runs` 数据渲染（运行时间、状态、告警计数）。

## 2) “下载 YAML”按钮未实现导出

- 现象：
  - 工作台按钮已展示（`WorkbenchPage.tsx`），但点击无动作。
- 根因：
  - 前端未接入下载事件与 API 调用；
  - 后端 `api.py` 里有 `download_yaml(...)` 函数，但 `http_server.py` 未暴露对应路由。
- 影响：
  - 用户无法验证“编辑后配置可导出归档”这一主路径能力。
- 建议修复：
  - 后端新增路由：`GET /api/configs/{input_config_id}/download-yaml`（返回 `filename + yaml_text` 或 `text/yaml` 下载响应）。
  - 前端新增 `configClient.downloadYaml`，工作台按钮触发浏览器下载（Blob + `a.download`）。
  - 增加前端测试：按钮点击后调用下载 API，生成期望文件名。

## 3) 运行结果落 SQLite 与前端展示脱节

- 已验证事实（本地库）：
  - `out/brake_calc.db` 中 `calculation_runs` 已有记录；
  - 最近记录 `status='succeeded'` 且 `report_json` 非空（长度约 38k-39k）。
- 当前缺口：
  - 前端结果页只使用当前会话内 `runtimeReport`；
  - 刷新页面或重新进入项目后，不会自动从 `calculation_runs` 恢复上次运行结果。
- 影响：
  - “运行结果持久化可回看”在产品层面尚未打通，仅后端已落库。
- 建议修复：
  - 新增后端接口：按 `input_config_id` 或 `project_id` 返回 latest run（含 `status/report_json/created_at`）。
  - 前端在总览进入结果页时优先读取 latest run；无 run 时保持“暂无结果（请先运行）”。
  - 增加集成测试：模拟刷新后仍可查看最近一次运行结果。

---

## 备注

- 本次仅做自查和问题归档，未改动上述 3 项行为逻辑。
- 当前前端测试基线（`frontend/src/App.test.tsx`）仍为通过状态。 
