# CI 與 GitHub Pages 配置

核對基準：main `7c861c4`，使用者合併的 PR #14（2026-11-25）。實際設定以 `.github/workflows/ci.yml`、`pages.yml` 為準；本次只同步文件，不修改 workflow。

## 觸發時機

| 操作 | Validate Life Studio | Deploy GitHub Pages |
|---|---|---|
| 功能分支單純 push | 不觸發 | 不觸發 |
| 建立／更新指向 main 的 PR | 執行 | 不觸發 |
| push／合併到 main | 執行 | 執行 |
| workflow_dispatch | 手動執行所選 workflow | 手動執行所選 workflow |

驗證不再使用所有分支 push + pull_request 的雙重觸發方式。功能分支 push 後沒有 CI run 是預期行為；開啟指向 main 的 PR，再核對該 PR 最新 head 的檢查。目前沒有 paths 過濾，文件 PR 也會觸發驗證。手動執行時須確認選到的 workflow 與 ref。

## 驗證工作

Ubuntu runner、Node.js 24、contents:read：checkout → setup-node/npm cache → `npm ci` → `npm test` → `npm run typecheck` → `npm run build` → `npx playwright install --with-deps chromium` → `npm run test:e2e`。觸發範圍改變，檢查內容沒有減少。

本地依變更執行適當檢查，依 AGENTS 保留必要回歸。程式變更完成前須核對相關數值/分支測試與 PC 流程；純文件變更可檢查內容、連結及 diff，不冒稱重新跑過程式測試。既有手機案例留在回歸套件，不代表目前啟動行動端適配。

## Pages 發布工作

build 使用 Node.js 24、`npm ci`、單元測試、typecheck 與靜態 build；設定 `NEXT_PUBLIC_BASE_PATH=/finance_game`，以上傳 `out/` 作為 Pages artifact。deploy 依賴 build，使用官方 configure-pages/deploy-pages，權限為 pages:write、id-token:write，目標 environment 為 github-pages。concurrency group 為 github-pages，cancel-in-progress=false。

兩個 workflows 獨立執行：Pages 的 build 不含 E2E，也不等待另一個 Validate workflow。PR CI 成功代表該提交的驗證結果；正式發布成功須另核對 main 提交的 Pages run、部署 SHA 與 environment URL。不能以本地 build、功能分支 push 或 PR CI 成功代替部署成功。

正式網站：https://adamguo88.github.io/finance_game/ 。真人驗收與 PC 全功能/建模完成狀態另依 PRD 與 issues，不由 CI 自動宣告完成。
