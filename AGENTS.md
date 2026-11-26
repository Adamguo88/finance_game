# Life Studio 開發規範
- 先讀 docs/PRD.md、ARCHITECTURE.md、ROADMAP.md 與 VALIDATION.md。
- 依 docs/ROADMAP.md 的短中長期目標及 NEXT_PHASE.md 佇列執行：先 #27 → #42 分項契約 → #43 引擎／遷移 → #44 指定項目事件；再 #45–#55 中期功能群、#23 報表、#6／#24 驗收，最後 #25 行動端。每次先回讀GitHub前置，Epic契約完成不代表子功能已實作。不得重建／重開已完成issues；#28/#29僅完成造型／初始化明細，分項模型另有責任。
- CI 依 docs/CI.md：指向 main 的 PR、push main 或 workflow_dispatch 才執行 Validate；功能分支單純 push 不觸發。核對最新 PR head 的檢查，Pages 發布結果另行確認，不修改使用者已調整的觸發配置。
- PC 優先：先完成 PC 全部規劃功能、UI／UX 與建模並驗收，再處理 iPad／手機。當前以滑鼠／鍵盤、桌面版面與 PC 效能為主，不新增行動端專屬適配任務；既有響應式與測試保留。細節以 PRD「開發優先順序：PC 優先」為準。
- 純前端 Next.js TypeScript，靜態輸出；不得新增 API routes、後端、登入、隨機事件、AI 或外部財務服務。
- domain 不得 import React、Next.js、Zustand、Dexie、DOM 或視覺模組。畫面僅消費 Snapshot；SVG 經 scene mapper 取得狀態。
- 金額是新臺幣分的整數。不可無聲變更計算順序、四捨五入、期間邊界或公式。變更公式必須提升 engineVersion、更新文件與測試；不支援版本明確拒絕，不偷偷重算。
- 原始輸入與事件參數是主要資料，快照是衍生結果。修改保留 history、revision、profile.version、event.version。
- 分支深拷貝初始資料與全部排程，保存 parentId/forkMonth；鎖定 <= forkMonth 的事件。父方案後續修改不向子方案傳播。
- 新增事件必須先寫數值例與邊界測試。先核心與分支不變性，再介面與美術。
- npm ci；npm test；npm run typecheck；npm run build；npm run test:e2e。新增測試要驗證使用者行為或財務不變量。
- 不提交 node_modules、.next、真實個資、token。避免覆蓋既有 repository 或強制 push。
- 報告只列實際執行的檢查；區分本地/遠端 shell、Codex CLI、Codex Cloud，未登入不表示已啟動任務。
- 任務完成須提供變更、驗證命令與結果、剩餘風險；不要自行宣告所有 issues 完成。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
