> 目前任務與 CI 基準（2026-11-25）：下一階段按 docs/NEXT_PHASE.md 的 GitHub #15–#25 依賴執行，先 #15 PC 全功能矩陣，再 UI／UX、2D 建模與場景。PR #10/#11/#12 已合併，勿重做已完成能力。CI 依 PR #14：指向 main 的 PR、push main 或 workflow_dispatch 才執行驗證，功能分支 push 不觸發；完整檢查內容及 Pages 發布差異見 docs/CI.md。下方 v0.1 任務僅供歷史參考，與現況不同時採本段、PRD 及最新 roadmap。

> 最新開發指令（2026-11-25）：先完成 PC 端全部規劃功能，包含 UI／UX、建模與視覺呈現，經 PC 完整驗收後再處理 iPad／手機。當前不新增平板／手機適配任務；以下歷史任務若有行動端前置要求，以此指令與 docs/PRD.md 的 PC 優先規範為準。

> 歷史交接提醒（2026-11-25）：下列是 v0.1 初始驗收任務。PR #8 已合併、#1–#5 已結案，#6 真人驗收仍開啟；使用者已另行授權 v0.2 分支開發。接續工作先讀 README、VALIDATION 與 V02_FINANCIAL_CONTRACT，勿將此舊任務當成目前進度。

# 可直接提交 Codex 的任務
## 執行前提
實際 repository：https://github.com/Adamguo88/finance_game ，產品名稱 Life Studio，已依使用者同意公開。
main 已有完整 v0.1 初始實作與測試；分階段 issues #1–#7 已建立。
本對話沒有啟動 Codex Cloud 任務；請在已連接此倉庫的 Cloud 環境提交下列內容。

## 貼入任務指令
在目前選取的 Adamguo88/finance_game repository（產品名 Life Studio） 中，讀取 AGENTS.md、docs/PRD.md、ARCHITECTURE.md、ROADMAP.md 與 VALIDATION.md。先檢查現有 v0.1 實作與測試，不重建專案。讀取 GitHub issues #1–#6，依賴順序檢查現有成果與未通過驗收的部分；#7 為 v0.2 暫不實作。

目標：驗收並補完 Life Studio v0.1 垂直切片。支援初始財務輸入、買房、失業、逐月快照、事件增刪改、時間控制、SVG 場景、不可變分支、同步比較、IndexedDB 及 JSON 備份。遵守純前端 Next.js TypeScript 架構，不增加 AI、隨機事件、後端、登入或 3D。

先跑 npm ci、npm test、npm run typecheck、npm run build，接著 npx playwright install --with-deps chromium 與 npm run test:e2e。先修核心計算與分支不變性，尤其利率/四捨五入、清償、失業區間、分支點跨月、歷史版本及錯誤存檔。UI 使用相同月份同步，不能各自播放；模式切換保留時間，終點停止。所有新財務事件與公式變更先有測試。

完成 PRD 驗收情境，優先檢查 PC 桌面版、滑鼠／鍵盤操作（iPad／手機適配延後至 PC 全功能完成）、匯入失敗不覆蓋資料、存檔重新載入、歷史修改保留參數。將真實執行結果與未完成項寫入 docs/VALIDATION.md。若發現需求不一致，選擇最小修復，將規格假設記錄在 PR。

在新分支開啟可審查 PR，不自動合併。不提交真實財務資料、憑證或 build/cache。最後回覆真實 PR URL、執行命令與結果、已知限制。若 Cloud、GitHub 或套件安裝失敗，明確說明未執行內容，不聲稱部署、推送或驗收完成。
