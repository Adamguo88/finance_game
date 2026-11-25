# 可直接提交 Codex 的任務
## 執行前提
實際 repository：https://github.com/Adamguo88/finance_game 。產品名為 Life Studio，使用者已同意使用公開倉庫。
目前本對話的 GitHub 整合寫入被 403 拒絕，尚未成功上傳程式碼或建立 issues；請先上傳完整專案，或將交付壓縮檔提供給 Codex。
本對話尚未啟動 Codex Cloud。請在已連接 finance_game 的 Cloud 環境提交以下任務。

## 貼入任務指令
在目前選取的 Adamguo88/finance_game repository（產品名 Life Studio） 中，讀取 AGENTS.md、docs/PRD.md、ARCHITECTURE.md、ROADMAP.md 與 VALIDATION.md。先檢查現有 v0.1 實作與測試，不重建專案，不假設 issue 已建立。

目標：驗收並補完 Life Studio v0.1 垂直切片。支援初始財務輸入、買房、失業、逐月快照、事件增刪改、時間控制、SVG 場景、不可變分支、同步比較、IndexedDB 及 JSON 備份。遵守純前端 Next.js TypeScript 架構，不增加 AI、隨機事件、後端、登入或 3D。

先跑 npm ci、npm test、npm run typecheck、npm run build，接著 npx playwright install --with-deps chromium 與 npm run test:e2e。先修核心計算與分支不變性，尤其利率/四捨五入、清償、失業區間、分支點跨月、歷史版本及錯誤存檔。UI 使用相同月份同步，不能各自播放；模式切換保留時間，終點停止。所有新財務事件與公式變更先有測試。

完成 PRD 驗收情境，檢查桌面與手機版、鍵盤操作、匯入失敗不覆蓋資料、存檔重新載入、歷史修改保留參數。將真實執行結果與未完成項寫入 docs/VALIDATION.md。若發現需求不一致，選擇最小修復，將規格假設記錄在 PR。

在新分支開啟可審查 PR，不自動合併。不提交真實財務資料、憑證或 build/cache。最後回覆真實 PR URL、執行命令與結果、已知限制。若 Cloud、GitHub 或套件安裝失敗，明確說明未執行內容，不聲稱部署、推送或驗收完成。
